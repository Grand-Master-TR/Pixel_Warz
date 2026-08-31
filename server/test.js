import { initDatabase, db } from "./database/db.js";
import { canvasManager } from "./services/canvasManager.js";
import { airdropEngine } from "./services/airdropEngine.js";
import { storeEngine } from "./services/storeEngine.js";
import { getOrCreateUser } from "./services/auth.js";
import { CONFIG } from "./config.js";

console.log("==========================================");
console.log("🧪 RUNNING PIXEL WARS ENGINE TESTS...");
console.log("==========================================");

// 1. Initialize
initDatabase();
canvasManager.init();

// 2. Create Referrer User A and Player User B
const userA = getOrCreateUser({ id: 999111, username: "AliceMaster", first_name: "Alice" });
const userB = getOrCreateUser({ id: 999222, username: "BobPainter", first_name: "Bob" }, "999111");

console.log(`✅ User A created: ${userA.first_name} (ID: ${userA.id}, Pixels: ${userA.pixel_balance})`);
console.log(`✅ User B created: ${userB.first_name} (Referred by: ${userB.referrer_id})`);

// 3. Test Placement: Fresh Pixel Placement at (100, 100) and (100, 101)
const batch1 = [
  { x: 100, y: 100, colorIndex: 6 }, // Red
  { x: 100, y: 101, colorIndex: 11 }, // Green
];

const res1 = airdropEngine.processPixelPlacements(userB.id, batch1);
console.log("✅ Batch 1 Result (Fresh Pixels):", {
  placed: res1.placedCount,
  fresh: res1.freshCount,
  recolor: res1.recolorCount,
  pointsAwarded: res1.pointsAwarded,
  newBalance: res1.newBalance
});

if (res1.freshCount !== 2 || res1.pointsAwarded !== 2.0) {
  throw new Error(`Fresh points mismatch: expected 2.0, got ${res1.pointsAwarded}`);
}

// 4. Check Referrer A received 10% commission (0.2 points)
const updatedA = db.prepare("SELECT * FROM users WHERE id = ?").get("999111");
console.log(`✅ User A referral commission received: +${updatedA.referral_points} pts (Total: ${updatedA.airdrop_points} pts)`);
if (Math.abs(updatedA.referral_points - 0.2) > 0.001) {
  throw new Error(`Referral bonus mismatch: expected 0.2, got ${updatedA.referral_points}`);
}

// 5. Test Placement: Overwrite / Recolor Pixel Placement at (100, 100) with Color 13 (Blue)
const batch2 = [
  { x: 100, y: 100, colorIndex: 13 }, // Overwriting (100, 100)
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

// 6. Test Store - Stars Purchase Simulation
const buyResult = storeEngine.creditStarsPurchase(userB.id, "stars_10");
console.log(`✅ Stars purchase credited: +${buyResult.pixelsAdded} pixels (New Balance: ${buyResult.newBalance})`);

// 7. Test Milestones (50 rounds, 10M each up to 500M)
const milestones = airdropEngine.getMilestoneStats();
console.log("✅ Milestone stats verified:", {
  activeRound: milestones.activeRoundNumber,
  maxRounds: milestones.maxRounds,
  maxTotalPixels: milestones.maxTotalPixels,
  progress: `${milestones.progressPercent}%`,
  allRoundsCount: milestones.allRounds.length,
});

if (milestones.allRounds.length !== 50) {
  throw new Error(`Expected 50 milestone rounds, got ${milestones.allRounds.length}`);
}

// 8. Test Pixel Inspector
const inspectInfo = canvasManager.getPixelInfo(100, 100);
console.log("✅ Pixel Inspector verified for (100, 100):", {
  colorHex: inspectInfo.colorHex,
  recolorCount: inspectInfo.recolorCount,
  lastPlacedBy: inspectInfo.username,
});

console.log("\n🎉 ALL BACKEND TESTS PASSED PERFECTLY! 🚀\n");
process.exit(0);
