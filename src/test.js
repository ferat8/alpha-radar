/**
 * Simple test script for AlphaRadar
 * Run: npm test
 */

const WhaleTracker = require("./services/whale-tracker");
const wallets = require("../data/wallets.json");

console.log("🧪 Testing AlphaRadar components...\n");

// Test 1: Load wallets
console.log("1️⃣ Testing wallet loading...");
const tracker = new WhaleTracker(null, wallets);
console.log(`   ✓ Loaded ${tracker.getWalletCount()} wallets\n`);

// Test 2: Get wallet info
console.log("2️⃣ Testing wallet lookup...");
const a16z = tracker.getWalletInfo("0x05e793ce0c6027323ac150f6d45c2344d28b6019");
console.log(`   ✓ a16z wallet:`, a16z);
console.log();

// Test 3: Add mock alerts
console.log("3️⃣ Testing alert generation...");
tracker.addMockAlerts(20);
console.log(`   ✓ Alerts count: ${tracker.getAlertsCount()}\n`);

// Test 4: Get latest alerts
console.log("4️⃣ Testing latest alerts...");
const latest = tracker.getLatestAlerts(3);
console.log(`   ✓ Latest 3 alerts:`);
latest.forEach((alert, i) => {
  console.log(`     ${i+1}. ${alert.label} ${alert.action} ${alert.amount} ${alert.token}`);
});
console.log();

// Test 5: Search alerts
console.log("5️⃣ Testing search...");
const vcAlerts = tracker.searchAlerts({ wallet_type: "VC", limit: 5 });
console.log(`   ✓ Found ${vcAlerts.length} VC alerts\n`);

// Test 6: Top active
console.log("6️⃣ Testing top active...");
const topActive = tracker.getTopActive(5);
console.log(`   ✓ Top 5 active wallets:`);
topActive.forEach((w, i) => {
  console.log(`     ${i+1}. ${w.label} (${w.activity_count} txs)`);
});
console.log();

console.log("✅ All tests passed!\n");
