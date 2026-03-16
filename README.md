# 🎯 AlphaRadar

> Real-time whale & smart money tracking API powered by X402 micropayments

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![X402](https://img.shields.io/badge/Payments-X402-blue.svg)](https://docs.cdp.coinbase.com/x402)
[![Base](https://img.shields.io/badge/Chain-Base-0052FF.svg)](https://base.org)

## 🚀 What is AlphaRadar?

AlphaRadar tracks whale wallets, VC funds, and smart money movements in real-time. Pay-per-request via X402 protocol — no API keys, no subscriptions.

## 💰 Pricing

| Endpoint | Price | Description |
|----------|-------|-------------|
| `/api/alerts/latest` | $0.005 | Latest 10 whale alerts |
| `/api/wallets/:address` | $0.003 | Wallet info & label |
| `/api/wallets/top` | $0.005 | Top 20 active whales |
| `/api/search` | $0.01 | Search by criteria |

## 🔧 Quick Start

### For AI Agents (X402)

```bash
# Check endpoint details
npx awal@latest x402 details https://api.alpharadar.xyz/api/alerts/latest

# Make paid request
npx awal@latest x402 pay https://api.alpharadar.xyz/api/alerts/latest
```

### Response Example

```json
{
  "alerts": [
    {
      "wallet": "0x05e793ce...",
      "label": "a16z",
      "action": "buy",
      "token": "ETH",
      "amount": 1500,
      "usd_value": 4500000,
      "timestamp": 1710595200
    }
  ]
}
```

## 🏗️ Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Blockchain │ ──► │  The Graph  │ ──► │  AlphaRadar │
│    (Base)   │     │  (Indexer)  │     │  (X402 API) │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                                              ▼
                                        ┌─────────────┐
                                        │   Agents    │
                                        │ (pay USDC)  │
                                        └─────────────┘
```

## 📦 Self-Host

```bash
git clone https://github.com/ferat8/alpha-radar.git
cd alpha-radar
npm install
cp .env.example .env
# Edit .env with your wallet address
npm start
```

## 🔐 Environment Variables

```env
WALLET_ADDRESS=0x...    # Your USDC wallet on Base
RPC_URL=https://...     # Base RPC endpoint
PORT=3000               # Server port
```

## 📊 Tracked Wallets

- **50+ VC funds** (a16z, Paradigm, etc.)
- **100+ whale wallets**
- **Market makers**
- **Exchange hot wallets**

## 🤝 Contributing

PRs welcome! See [CONTRIBUTING.md](CONTRIBUTING.md)

## 📜 License

MIT — use freely, attribution appreciated.

---

**Built with X402** | [Coinbase Developer Platform](https://docs.cdp.coinbase.com/x402)
