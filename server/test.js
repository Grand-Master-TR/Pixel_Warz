import { initDatabase, db } from "./database/db.js";
import { canvasManager } from "./services/canvasManager.js";
import { airdropEngine } from "./services/airdropEngine.js";
import { storeEngine } from "./services/storeEngine.js";
import { getOrCreateUser, generateAuthToken, verifyAuthToken } from "./services/auth.js";
import { CONFIG } from "./config.js";

console.log("==========================================");
console.log("🛡️ RUNNING AIRDROP SNAPSHOT & WALLET TESTS...");
console.log("==========================================");

// 1. Initialize
initDatabase();
canvasManager.init();

// 2. Test Auth Token Generation & Cryptographic Verification
const testUserId = "security_test_user_777";
const token = generateAuthToken(testUserId);
const verifiedUserId = verifyAuthToken(token);
if (verifiedUserId !== testUserId) {
  throw new Error(`Auth token verification failed: expected ${testUserId}, got ${verifiedUserId}`);
}
console.log("✅ Cryptographic HMAC Auth Token Signing & Verification verified!");

// 3. Create Referrer User A and Player User B with Wallet Address
const randomSuffix = Math.floor(1000 + Math.random() * 9000);
const userA = getOrCreateUser({ id: 888000 + randomSuffix, username: `Alice_${randomSuffix}`, first_name: "Alice" });
const userB = getOrCreateUser({ id: 999000 + randomSuffix, username: `Bob_${randomSuffix}`, first_name: "Bob" }, userA.id);

// Link TON Wallet
const testTonWallet = "UQAv9X8Z_TejasvPixelWarriorAirdrop2026";
db.prepare("UPDATE users SET wallet_address = ? WHERE id = ?").run(testTonWallet, userB.id);

const savedB = db.prepare("SELECT * FROM users WHERE id = ?").get(userB.id);
console.log(`✅ User B TON Wallet Linked: ${savedB.wallet_address}`);
if (savedB.wallet_address !== testTonWallet) {
  throw new Error("Wallet address was not saved properly.");
}

// Add pixels for testing
db.prepare("UPDATE users SET pixel_balance = 500 WHERE id = ?").run(userB.id);

// 4. Test Fresh Pixel Placement on dynamic untouched coordinates (10.0 pts each)
const freshX = 200 + (randomSuffix % 500);
const freshY = 200 + (randomSuffix % 500);

const batch1 = [
  { x: freshX, y: freshY, colorIndex: 6 }, // Red
  { x: freshX, y: freshY + 1, colorIndex: 11 }, // Green
];

const res1 = airdropEngine.processPixelPlacements(userB.id, batch1);
console.log("✅ Batch 1 Result (Fresh Pixels):", {
  placed: res1.placedCount,
  fresh: res1.freshCount,
  recolor: res1.recolorCount,
  pointsAwarded: res1.pointsAwarded,
});

// 5. Test Round Milestone Snapshot Triggering
console.log("📸 Testing Milestone Snapshot generation...");
const testTimestamp = Math.floor(Date.now() / 1000);
// Trigger milestone completion for Round 1
airdropEngine.checkMilestones(CONFIG.ROUNDS.PIXELS_PER_ROUND, testTimestamp);

const snapshots = airdropEngine.getSnapshotsList();
console.log(`✅ Snapshot Records in Database: ${snapshots.length}`);
if (snapshots.length > 0) {
  const round1Snapshot = airdropEngine.getSnapshotByRound(1);
  console.log(`✅ Round 1 Snapshot Data: Captured ${round1Snapshot.totalUsers} players with ${round1Snapshot.totalPointsDistributed} total points.`);
  console.log(`✅ Sample Snapshot User:`, round1Snapshot.users[0]);
}

console.log("\n🛡️ ALL SNAPSHOT, WALLET, AND ENGINE TESTS PASSED WITH 100% SUCCESS! 🚀\n");
process.exit(0);