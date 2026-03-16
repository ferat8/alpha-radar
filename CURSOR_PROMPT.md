# Cursor Prompt — X402 Smart Money API

## Задача

Создать X402-native API сервис для whale/smart money alerts, который:
1. Отслеживает транзакции крупных кошельков
2. Продаёт данные через X402 микроплатежи
3. Работает на Base (USDC)

---

## Структура проекта

```
x402-smart-money/
├── package.json
├── .env.example
├── src/
│   ├── index.js          # Express сервер с X402
│   ├── routes/
│   │   ├── alerts.js     # Whale alerts endpoint
│   │   ├── wallets.js    # Wallet tracking endpoints
│   │   └── health.js     # Health check (free)
│   ├── services/
│   │   ├── whale-tracker.js   # Отслеживание китов
│   │   ├── wallet-labels.js   # Метки кошельков (VC, whale, etc)
│   │   └── blockchain.js      # RPC взаимодействие
│   ├── data/
│   │   └── wallets.json       # База известных кошельков
│   └── utils/
│       └── format.js          # Форматирование ответов
├── .well-known/
│   └── x402-manifest.json     # X402 манифест для Bazaar
└── README.md
```

---

## Технологии

- **Node.js** + **Express**
- **x402-express** — платёжный middleware
- **ethers.js** — взаимодействие с блокчейном
- **Alchemy/Infura** — RPC провайдер

---

## Endpoints с ценами

| Endpoint | Метод | Цена | Описание |
|----------|-------|------|----------|
| `/health` | GET | FREE | Health check |
| `/api/alerts/latest` | GET | $0.005 | Последние 10 алертов |
| `/api/alerts/stream` | GET | $0.01 | Real-time поток |
| `/api/wallets/:address` | GET | $0.003 | Инфо о кошельке |
| `/api/wallets/top` | GET | $0.005 | Топ активных китов |
| `/api/search` | POST | $0.01 | Поиск по критериям |

---

## Код: index.js

```javascript
const express = require("express");
const { paymentMiddleware } = require("x402-express");
require("dotenv").config();

const app = express();
app.use(express.json());

const PAY_TO = process.env.WALLET_ADDRESS;

// X402 pricing
const payment = paymentMiddleware(PAY_TO, {
  "GET /api/alerts/latest": {
    price: "$0.005",
    network: "base",
    config: {
      description: "Get latest 10 whale alerts",
      outputSchema: {
        type: "array",
        items: {
          type: "object",
          properties: {
            wallet: { type: "string" },
            action: { type: "string" },
            token: { type: "string" },
            amount: { type: "number" },
            usd_value: { type: "number" },
            timestamp: { type: "number" }
          }
        }
      }
    }
  },
  "GET /api/wallets/:address": {
    price: "$0.003",
    network: "base",
    config: {
      description: "Get wallet info and label (VC, whale, etc)"
    }
  },
  "GET /api/wallets/top": {
    price: "$0.005",
    network: "base",
    config: {
      description: "Top 20 most active whales in last 24h"
    }
  },
  "POST /api/search": {
    price: "$0.01",
    network: "base",
    config: {
      description: "Search alerts by criteria",
      inputSchema: {
        bodyType: "json",
        bodyFields: {
          token: { type: "string", description: "Token symbol" },
          min_usd: { type: "number", description: "Minimum USD value" },
          wallet_type: { type: "string", description: "VC, whale, or all" }
        }
      }
    }
  }
});

// Free endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "smart-money-api" });
});

// Protected endpoints
app.get("/api/alerts/latest", payment, async (req, res) => {
  const alerts = await getLatestAlerts(10);
  res.json(alerts);
});

app.get("/api/wallets/:address", payment, async (req, res) => {
  const info = await getWalletInfo(req.params.address);
  res.json(info);
});

app.get("/api/wallets/top", payment, async (req, res) => {
  const top = await getTopWhales(20);
  res.json(top);
});

app.post("/api/search", payment, async (req, res) => {
  const results = await searchAlerts(req.body);
  res.json(results);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Smart Money API running on port ${PORT}`);
  console.log(`Payments go to: ${PAY_TO}`);
});
```

---

## Код: whale-tracker.js

```javascript
const { ethers } = require("ethers");
const walletLabels = require("../data/wallets.json");

class WhaleTracker {
  constructor(rpcUrl) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.alerts = [];
    this.maxAlerts = 1000;
  }

  async trackTransaction(tx) {
    const from = tx.from.toLowerCase();
    const to = tx.to?.toLowerCase();
    
    // Check if known wallet
    const fromLabel = walletLabels[from];
    const toLabel = walletLabels[to];
    
    if (fromLabel || toLabel) {
      const alert = {
        txHash: tx.hash,
        from: from,
        to: to,
        fromLabel: fromLabel || "unknown",
        toLabel: toLabel || "unknown",
        value: ethers.formatEther(tx.value),
        timestamp: Date.now()
      };
      
      this.alerts.unshift(alert);
      if (this.alerts.length > this.maxAlerts) {
        this.alerts.pop();
      }
      
      return alert;
    }
    
    return null;
  }

  getLatest(count = 10) {
    return this.alerts.slice(0, count);
  }

  search(criteria) {
    return this.alerts.filter(alert => {
      if (criteria.token && !alert.token?.includes(criteria.token)) return false;
      if (criteria.min_usd && alert.usd_value < criteria.min_usd) return false;
      if (criteria.wallet_type && criteria.wallet_type !== "all") {
        const label = alert.fromLabel || alert.toLabel;
        if (!label.includes(criteria.wallet_type)) return false;
      }
      return true;
    });
  }
}

module.exports = WhaleTracker;
```

---

## Данные: wallets.json (пример)

```json
{
  "0x1234...": { "label": "a16z", "type": "VC" },
  "0x5678...": { "label": "Paradigm", "type": "VC" },
  "0x9abc...": { "label": "Whale #1", "type": "whale" },
  "0xdef0...": { "label": "Jump Trading", "type": "MM" }
}
```

---

## .env.example

```env
WALLET_ADDRESS=0x_YOUR_USDC_WALLET_ON_BASE
RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
PORT=3000
```

---

## Деплой

### Вариант 1: VPS (Hetzner/DigitalOcean)
```bash
# На сервере
git clone <repo>
cd x402-smart-money
npm install
cp .env.example .env
# Заполнить .env
pm2 start src/index.js --name smart-money-api
```

### Вариант 2: Cloudflare Workers
- Интеграция с x402 из коробки
- См. blog.cloudflare.com/x402

---

## X402 Manifest (.well-known/x402-manifest.json)

```json
{
  "name": "Smart Money API",
  "description": "Real-time whale and VC wallet tracking",
  "version": "1.0.0",
  "endpoints": [
    {
      "path": "/api/alerts/latest",
      "method": "GET",
      "price": "$0.005",
      "description": "Latest 10 whale alerts"
    },
    {
      "path": "/api/wallets/:address",
      "method": "GET",
      "price": "$0.003",
      "description": "Wallet info and label"
    }
  ],
  "payTo": "0x_YOUR_WALLET",
  "network": "base",
  "category": "analytics"
}
```

---

## Следующие шаги

1. [ ] Создать Base кошелёк для получения платежей
2. [ ] Собрать базу кошельков (50+ VC, 100+ whales)
3. [ ] Получить RPC ключ (Alchemy бесплатно)
4. [ ] Написать код через Cursor
5. [ ] Задеплоить на VPS
6. [ ] Зарегистрировать на Coinbase Bazaar
7. [ ] Анонс в Twitter

---

## Монетизация (прогноз)

| Месяц | Запросов/день | Revenue |
|-------|---------------|---------|
| 1 | 1,000 | $150 |
| 3 | 10,000 | $1,500 |
| 6 | 50,000 | $7,500 |

При среднем чеке $0.005-0.01 за запрос.
