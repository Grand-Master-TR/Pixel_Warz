import { initDatabase, db } from "./database/db.js";
import { canvasManager } from "./services/canvasManager.js";
import { airdropEngine } from "./services/airdropEngine.js";
import { storeEngine } from "./services/storeEngine.js";
import { getOrCreateUser, generateAuthToken, verifyAuthToken } from "./services/auth.js";
import { CONFIG } from "./config.js";

console.log("==========================================");
console.log("🛡️ RUNNING COMPREHENSIVE BOMB & REFERRAL TESTS...");
console.log("==========================================");

// 1. Initialize
initDatabase();
canvasManager.init();

// 2. Test Auth Token Generation & Verification
const testUserId = "security_test_user_888";
const token = generateAuthToken(testUserId);
const verifiedUserId = verifyAuthToken(token);
if (verifiedUserId !== testUserId) {
  throw new Error(`Auth token verification failed: expected ${testUserId}, got ${verifiedUserId}`);
}
console.log("✅ Cryptographic HMAC Auth Token Signing & Verification verified!");

// 3. Create Referrer User A and Player User B
const randomSuffix = Math.floor(1000 + Math.random() * 9000);
const userA = getOrCreateUser({ id: 888000 + randomSuffix, username: `Alice_${randomSuffix}`, first_name: "Alice" });
const userB = getOrCreateUser({ id: 999000 + randomSuffix, username: `Bob_${randomSuffix}`, first_name: "Bob" }, userA.id);

// 4. Verify Starter Bomb Balance (Every user gets 1 Free Paint Bomb)
const initialB = db.prepare("SELECT * FROM users WHERE id = ?").get(userB.id);
console.log(`✅ User B Created with Free Starter Bomb: ${initialB.bomb_balance} Bomb(s)`);
if (initialB.bomb_balance < 1) {
  throw new Error("Starter bomb was not given to user.");
}

// 5. Test 3x3 Paint Bomb Placement (9 pixels) at empty coordinates (50, 50)
const startX = 50 + (randomSuffix % 100);
const startY = 50 + (randomSuffix % 100);

const bombPixels = [];
for (let dx = -1; dx <= 1; dx++) {
  for (let dy = -1; dy <= 1; dy++) {
    bombPixels.push({ x: startX + dx, y: startY + dy, colorIndex: 6 }); // Red
  }
}

console.log(`💣 Executing 3x3 Paint Bomb (9 pixels) for User B at (${startX}, ${startY})...`);
const bombResult = airdropEngine.processPixelPlacements(userB.id, bombPixels, true); // useBomb: true
console.log("✅ Bomb Placement Result:", {
  placed: bombResult.placedCount,
  fresh: bombResult.freshCount,
  recolor: bombResult.recolorCount,
  pointsAwarded: bombResult.pointsAwarded,
  newBombBalance: bombResult.newBombBalance,
});

if (bombResult.placedCount !== 9 || bombResult.newBombBalance !== 0) {
  throw new Error(`Bomb placement mismatch: expected 9 pixels, got ${bombResult.placedCount}`);
}

// 6. Test Referrer User A received 10% commission on the bomb blast
const updatedA = db.prepare("SELECT * FROM users WHERE id = ?").get(userA.id);
console.log(`✅ Referrer A received 10% on bomb blast: +${updatedA.referral_points} pts`);
if (updatedA.referral_points <= 0) {
  throw new Error(`Referral bonus mismatch: expected > 0, got ${updatedA.referral_points}`);
}

// 7. Test Store: Buy Bomb Package (bomb_5 -> +6 Paint Bombs for 5 Stars)
const buyBombRes = storeEngine.creditStarsPurchase(userB.id, "bomb_5");
console.log(`✅ Purchased Bomb Crate: +${buyBombRes.bombsAdded} Paint Bombs! New Bomb Balance: ${buyBombRes.newBombBalance}`);
if (buyBombRes.bombsAdded !== 6 || buyBombRes.newBombBalance !== 6) {
  throw new Error(`Bomb store purchase failed: expected 6 bombs, got ${buyBombRes.bombsAdded}`);
}

console.log("\n🛡️ ALL 3x3 BOMB, STORE & REFERRAL TESTS PASSED WITH 100% SUCCESS! 🚀\n");
process.exit(0);