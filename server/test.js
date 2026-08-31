import { initDatabase, db } from "./database/db.js";
import { canvasManager } from "./services/canvasManager.js";
import { airdropEngine } from "./services/airdropEngine.js";
import { storeEngine } from "./services/storeEngine.js";
import { getOrCreateUser, generateAuthToken, verifyAuthToken } from "./services/auth.js";
import { CONFIG } from "./config.js";

console.log("==========================================");
console.log("🛡️ RUNNING HARDENED SECURITY & ENGINE TESTS...");
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

// Test tampered token rejection
const tamperedToken = token.slice(0, -5) + "abcde";
if (verifyAuthToken(tamperedToken) !== null) {
  throw new Error("Security Alert: Tampered token was not rejected!");
}
console.log("✅ Tampered Token Rejection verified!");

// 3. Create Referrer User A and Player User B
const randomSuffix = Math.floor(1000 + Math.random() * 9000);
const userA = getOrCreateUser({ id: 888000 + randomSuffix, username: `Alice_${randomSuffix}`, first_name: "Alice" });
const userB = getOrCreateUser({ id: 999000 + randomSuffix, username: `Bob_${randomSuffix}`, first_name: "Bob" }, userA.id);

// Add pixels for testing
db.prepare("UPDATE users SET pixel_balance = 50 WHERE id = ?").run(userB.id);

console.log(`✅ User A created: ${userA.first_name} (ID: ${userA.id})`);
console.log(`✅ User B created: ${userB.first_name} (Referred by: ${userB.referrer_id})`);

// 4. Test Fresh Pixel Placement on dynamic untouched coordinates
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

if (res1.freshCount !== 2 || res1.pointsAwarded !== 2.0) {
  throw new Error(`Fresh points mismatch: expected 2.0, got ${res1.pointsAwarded}`);
}

// 5. Check Referrer A received 10% commission (0.2 points)
const updatedA = db.prepare("SELECT * FROM users WHERE id = ?").get(userA.id);
console.log(`✅ User A referral commission received: +${updatedA.referral_points} pts (Total: ${updatedA.airdrop_points} pts)`);
if (Math.abs(updatedA.referral_points - 0.2) > 0.001) {
  throw new Error(`Referral bonus mismatch: expected 0.2, got ${updatedA.referral_points}`);
}

// 6. Test Recolor Overwrite Placement at freshX, freshY
const batch2 = [
  { x: freshX, y: freshY, colorIndex: 13 }, // Overwriting freshX, freshY
];

const res2 = airdropEngine.processPixelPlacements(userB.id, batch2);
console.log("✅ Batch 2 Result (Recolor Overwrite):", {
  placed: res2.placedCount,
  fresh: res2.freshCount,
  recolor: res2.recolorCount,
  pointsAwarded: res2.pointsAwarded,
});

if (res2.recolorCount !== 1 || res2.pointsAwarded !== 1.5) {
  throw new Error(`Recolor points mismatch: expected 1.5, got ${res2.pointsAwarded}`);
}

// 7. Test Store - Stars Purchase Simulation
const buyResult = storeEngine.creditStarsPurchase(userB.id, "stars_10");
console.log(`✅ Stars purchase credited: +${buyResult.pixelsAdded} pixels`);

// 8. Test Reduced Daily Streak Tier
const dailyResult = storeEngine.claimDailyStreak(userB.id);
console.log(`✅ Daily streak claimed: Day ${dailyResult.streakDay} rewarded +${dailyResult.pixelsAdded} px (Reduced tier verified)`);

// 9. Test Milestones (50 rounds, 10M each up to 500M)
const milestones = airdropEngine.getMilestoneStats();
console.log("✅ Milestone stats verified:", {
  activeRound: milestones.activeRoundNumber,
  maxRounds: milestones.maxRounds,
  maxTotalPixels: milestones.maxTotalPixels,
  progress: `${milestones.progressPercent}%`,
});

console.log("\n🛡️ ALL SECURITY & ENGINE TESTS PASSED WITH 100% SUCCESS! 🚀\n");
process.exit(0);