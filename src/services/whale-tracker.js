const { ethers } = require("ethers");

class WhaleTracker {
  constructor(rpcUrl, walletsData) {
    this.provider = rpcUrl ? new ethers.JsonRpcProvider(rpcUrl) : null;
    this.wallets = this.flattenWallets(walletsData);
    this.alerts = [];
    this.maxAlerts = 10000;
    this.activityCount = {};
    
    console.log(`📊 Loaded ${Object.keys(this.wallets).length} wallets`);
  }

  // Flatten all wallet categories into single lookup object
  flattenWallets(data) {
    const flat = {};
    const categories = ['vc_funds', 'whales', 'market_makers', 'defi_protocols'];
    
    for (const category of categories) {
      if (data[category]) {
        for (const [address, info] of Object.entries(data[category])) {
          flat[address.toLowerCase()] = {
            ...info,
            category
          };
        }
      }
    }
    
    return flat;
  }

  // Get wallet info by address
  getWalletInfo(address) {
    return this.wallets[address.toLowerCase()] || null;
  }

  // Get total wallet count
  getWalletCount() {
    return Object.keys(this.wallets).length;
  }

  // Get alerts count
  getAlertsCount() {
    return this.alerts.length;
  }

  // Check if address is tracked
  isTracked(address) {
    return !!this.wallets[address.toLowerCase()];
  }

  // Add new alert
  addAlert(alert) {
    const normalized = {
      ...alert,
      from: alert.from?.toLowerCase(),
      to: alert.to?.toLowerCase(),
      timestamp: alert.timestamp || Date.now()
    };

    // Add labels
    normalized.fromLabel = this.getWalletInfo(normalized.from)?.label || "Unknown";
    normalized.toLabel = this.getWalletInfo(normalized.to)?.label || "Unknown";
    normalized.fromType = this.getWalletInfo(normalized.from)?.type || "unknown";
    normalized.toType = this.getWalletInfo(normalized.to)?.type || "unknown";

    // Track activity
    if (normalized.from) {
      this.activityCount[normalized.from] = (this.activityCount[normalized.from] || 0) + 1;
    }
    if (normalized.to) {
      this.activityCount[normalized.to] = (this.activityCount[normalized.to] || 0) + 1;
    }

    // Add to alerts
    this.alerts.unshift(normalized);
    
    // Trim if needed
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(0, this.maxAlerts);
    }

    return normalized;
  }

  // Get latest alerts
  getLatestAlerts(limit = 10) {
    return this.alerts.slice(0, limit).map(alert => ({
      wallet: alert.from,
      label: alert.fromLabel,
      type: alert.fromType,
      action: alert.action || "transfer",
      to: alert.to,
      toLabel: alert.toLabel,
      token: alert.token || "ETH",
      amount: alert.amount || "0",
      usd_value: alert.usd_value || 0,
      timestamp: alert.timestamp,
      tx_hash: alert.txHash || null
    }));
  }

  // Get top active wallets
  getTopActive(limit = 20) {
    const sorted = Object.entries(this.activityCount)
      .filter(([addr]) => this.isTracked(addr))
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    return sorted.map(([address, count]) => ({
      address,
      ...this.getWalletInfo(address),
      activity_count: count
    }));
  }

  // Search alerts
  searchAlerts({ token, min_usd, wallet_type, limit = 50 }) {
    let results = [...this.alerts];

    // Filter by token
    if (token) {
      const tokenUpper = token.toUpperCase();
      results = results.filter(a => 
        a.token?.toUpperCase().includes(tokenUpper)
      );
    }

    // Filter by min USD
    if (min_usd && min_usd > 0) {
      results = results.filter(a => (a.usd_value || 0) >= min_usd);
    }

    // Filter by wallet type
    if (wallet_type && wallet_type !== "all") {
      const typeUpper = wallet_type.toUpperCase();
      results = results.filter(a => 
        a.fromType?.toUpperCase() === typeUpper ||
        a.toType?.toUpperCase() === typeUpper
      );
    }

    return results.slice(0, limit).map(alert => ({
      wallet: alert.from,
      label: alert.fromLabel,
      type: alert.fromType,
      action: alert.action || "transfer",
      to: alert.to,
      toLabel: alert.toLabel,
      token: alert.token || "ETH",
      amount: alert.amount || "0",
      usd_value: alert.usd_value || 0,
      timestamp: alert.timestamp,
      tx_hash: alert.txHash || null
    }));
  }

  // Start listening to blockchain (call this separately)
  async startListening() {
    if (!this.provider) {
      console.warn("⚠️ No RPC provider configured");
      return;
    }

    console.log("🔗 Starting blockchain listener...");

    this.provider.on("block", async (blockNumber) => {
      try {
        const block = await this.provider.getBlock(blockNumber, true);
        
        if (block && block.transactions) {
          for (const tx of block.transactions) {
            const from = tx.from?.toLowerCase();
            const to = tx.to?.toLowerCase();

            // Check if from or to is a tracked wallet
            if (this.isTracked(from) || this.isTracked(to)) {
              const alert = {
                from,
                to,
                txHash: tx.hash,
                value: ethers.formatEther(tx.value || 0),
                token: "ETH",
                action: this.isTracked(from) ? "send" : "receive",
                timestamp: Date.now(),
                blockNumber
              };

              this.addAlert(alert);
              console.log(`🐋 Alert: ${alert.fromLabel} -> ${alert.toLabel} | ${alert.value} ETH`);
            }
          }
        }
      } catch (error) {
        console.error("Error processing block:", error.message);
      }
    });
  }

  // Add mock alerts for testing
  addMockAlerts(count = 10) {
    const addresses = Object.keys(this.wallets);
    const tokens = ["ETH", "USDC", "USDT", "WBTC", "LINK"];
    const actions = ["buy", "sell", "transfer"];

    for (let i = 0; i < count; i++) {
      const fromAddr = addresses[Math.floor(Math.random() * addresses.length)];
      const toAddr = addresses[Math.floor(Math.random() * addresses.length)];
      
      this.addAlert({
        from: fromAddr,
        to: toAddr,
        token: tokens[Math.floor(Math.random() * tokens.length)],
        action: actions[Math.floor(Math.random() * actions.length)],
        amount: (Math.random() * 1000).toFixed(2),
        usd_value: Math.floor(Math.random() * 5000000),
        txHash: "0x" + Math.random().toString(16).slice(2, 66),
        timestamp: Date.now() - Math.floor(Math.random() * 86400000)
      });
    }

    console.log(`📝 Added ${count} mock alerts`);
  }
}

module.exports = WhaleTracker;
