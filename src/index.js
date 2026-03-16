const express = require("express");
const { paymentMiddleware } = require("x402-express");
const WhaleTracker = require("./services/whale-tracker");
const wallets = require("../data/wallets.json");
require("dotenv").config();

const app = express();
app.use(express.json());

// Config
const PAY_TO = process.env.WALLET_ADDRESS;
const RPC_URL = process.env.RPC_URL;
const PORT = process.env.PORT || 3000;

if (!PAY_TO) {
  console.error("❌ WALLET_ADDRESS not set in .env");
  process.exit(1);
}

// Initialize tracker
const tracker = new WhaleTracker(RPC_URL, wallets);

// X402 payment middleware
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
            label: { type: "string" },
            action: { type: "string" },
            token: { type: "string" },
            amount: { type: "string" },
            usd_value: { type: "number" },
            timestamp: { type: "number" },
            tx_hash: { type: "string" }
          }
        }
      }
    }
  },
  "GET /api/wallets/:address": {
    price: "$0.003",
    network: "base",
    config: {
      description: "Get wallet info and label (VC, whale, MM, CEX)"
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
      description: "Search alerts by criteria (token, min_usd, wallet_type)",
      inputSchema: {
        bodyType: "json",
        bodyFields: {
          token: { type: "string", description: "Token symbol (optional)" },
          min_usd: { type: "number", description: "Minimum USD value (optional)" },
          wallet_type: { type: "string", description: "VC, whale, MM, CEX, or all (optional)" },
          limit: { type: "number", description: "Max results (default 50)" }
        }
      }
    }
  }
});

// ============== FREE ENDPOINTS ==============

// Health check
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    service: "alpha-radar",
    version: "1.0.0",
    tracked_wallets: tracker.getWalletCount(),
    alerts_count: tracker.getAlertsCount()
  });
});

// API info
app.get("/", (req, res) => {
  res.json({
    name: "AlphaRadar",
    description: "Real-time whale & smart money tracking API",
    version: "1.0.0",
    payment: "X402 (USDC on Base)",
    endpoints: {
      free: ["/health", "/"],
      paid: [
        { path: "/api/alerts/latest", price: "$0.005" },
        { path: "/api/wallets/:address", price: "$0.003" },
        { path: "/api/wallets/top", price: "$0.005" },
        { path: "/api/search", price: "$0.01" }
      ]
    },
    docs: "https://github.com/ferat8/alpha-radar"
  });
});

// ============== PAID ENDPOINTS ==============

// Latest alerts
app.get("/api/alerts/latest", payment, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const alerts = tracker.getLatestAlerts(limit);
    res.json({ alerts, count: alerts.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Wallet info
app.get("/api/wallets/:address", payment, async (req, res) => {
  try {
    const address = req.params.address.toLowerCase();
    const info = tracker.getWalletInfo(address);
    
    if (!info) {
      return res.json({ 
        address, 
        label: "Unknown",
        type: "unknown",
        tracked: false
      });
    }
    
    res.json({
      address,
      ...info,
      tracked: true
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Top active whales
app.get("/api/wallets/top", payment, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const top = tracker.getTopActive(limit);
    res.json({ wallets: top, count: top.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search alerts
app.post("/api/search", payment, async (req, res) => {
  try {
    const { token, min_usd, wallet_type, limit = 50 } = req.body;
    const results = tracker.searchAlerts({ token, min_usd, wallet_type, limit });
    res.json({ alerts: results, count: results.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============== START SERVER ==============

app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════╗
  ║         🎯 AlphaRadar API v1.0.0          ║
  ╠═══════════════════════════════════════════╣
  ║  Server:    http://localhost:${PORT}          ║
  ║  Payments:  ${PAY_TO.slice(0,10)}...${PAY_TO.slice(-8)}  ║
  ║  Wallets:   ${tracker.getWalletCount()} tracked               ║
  ║  X402:      USDC on Base                  ║
  ╚═══════════════════════════════════════════╝
  `);
});

module.exports = app;
