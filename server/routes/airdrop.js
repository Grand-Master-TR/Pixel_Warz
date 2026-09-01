import express from "express";
import { airdropEngine } from "../services/airdropEngine.js";
import { db } from "../database/db.js";

export const airdropRouter = express.Router();

// Debug endpoint - shows what env vars Render sees (SAFE: only shows key names, not values)
airdropRouter.get("/db-status", (req, res) => {
  const tursoUrl = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || process.env.TURSO_URL || "";
  const tursoToken = process.env.TURSO_AUTH_TOKEN || process.env.TURSO_TOKEN || "";

  // List all env var KEYS that contain turso/database/libsql (not values for security)
  const relevantEnvKeys = Object.keys(process.env).filter(k =>
    k.toLowerCase().includes("turso") ||
    k.toLowerCase().includes("database") ||
    k.toLowerCase().includes("libsql")
  );

  const isTursoConfigured = tursoUrl.startsWith("libsql://") && tursoToken.length > 0;

  let userCount = 0;
  let pixelCount = 0;
  try {
    userCount = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
    pixelCount = db.prepare("SELECT COUNT(*) as c FROM pixels").get().c;
  } catch (e) {}

  res.json({
    tursoConfigured: isTursoConfigured,
    tursoUrlPrefix: tursoUrl ? tursoUrl.slice(0, 30) + "..." : "NOT SET",
    tokenSet: tursoToken.length > 0,
    relevantEnvVarKeys: relevantEnvKeys,
    dbStats: { userCount, pixelCount },
    nodeEnv: process.env.NODE_ENV || "not set",
  });
});

// Cleanup all test / simulated accounts from database
airdropRouter.all("/cleanup-test-users", (req, res) => {
  try {
    const deletedUsers = db.prepare(`
      DELETE FROM users 
      WHERE id LIKE 'dev_%' 
         OR id LIKE 'guest_%' 
         OR id LIKE 'test_%' 
         OR id LIKE 'turso_%' 
         OR id LIKE 'persist_%' 
         OR id LIKE 'security_%'
         OR username LIKE 'Alice_%'
         OR username LIKE 'Bob_%'
         OR username LIKE 'turso_%'
         OR username LIKE 'Persist%'
         OR username LIKE 'dev_%'
         OR username LIKE 'warrior_%'
    `).run();

    db.prepare(`
      DELETE FROM placements_log 
      WHERE user_id LIKE 'dev_%' 
         OR user_id LIKE 'guest_%' 
         OR user_id LIKE 'test_%' 
         OR user_id LIKE 'turso_%' 
         OR user_id LIKE 'persist_%' 
         OR user_id LIKE 'security_%'
    `).run();

    db.prepare(`
      DELETE FROM transactions 
      WHERE user_id LIKE 'dev_%' 
         OR user_id LIKE 'guest_%' 
         OR user_id LIKE 'test_%' 
         OR user_id LIKE 'turso_%' 
         OR user_id LIKE 'persist_%' 
         OR user_id LIKE 'security_%'
    `).run();

    const remainingUsers = db.prepare("SELECT COUNT(*) as c FROM users").get().c;
    const realUsers = db.prepare("SELECT id, username, first_name, airdrop_points FROM users").all();

    console.log(`🧹 Cleaned up ${deletedUsers.changes} test accounts from database.`);

    res.json({
      success: true,
      message: `Cleaned up ${deletedUsers.changes} test accounts.`,
      deletedAccountsCount: deletedUsers.changes,
      remainingUsersCount: remainingUsers,
      realUsers,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Milestone Progress Stats (50 rounds up to 5 Billion pixels)
airdropRouter.get("/milestones", (req, res) => {
  try {
    const stats = airdropEngine.getMilestoneStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Top 100 Leaderboard
airdropRouter.get("/leaderboard", (req, res) => {
  const limit = Math.min(100, parseInt(req.query.limit, 10) || 50);
  try {
    const topUsers = airdropEngine.getLeaderboard(limit);
    res.json(topUsers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Referral Stats for a User
airdropRouter.get("/referrals/:userId", (req, res) => {
  const userId = req.params.userId;
  try {
    const recruits = db.prepare(`
      SELECT 
        id, 
        username, 
        first_name, 
        airdrop_points, 
        total_pixels_placed, 
        created_at
      FROM users
      WHERE referrer_id = ?
      ORDER BY airdrop_points DESC
      LIMIT 100
    `).all(userId);

    const user = db.prepare("SELECT referral_points FROM users WHERE id = ?").get(userId);

    res.json({
      totalRecruits: recruits.length,
      totalCommissionEarned: user?.referral_points || 0.0,
      recruits,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get List of Completed Round Snapshots
airdropRouter.get("/snapshots", (req, res) => {
  try {
    const snapshots = airdropEngine.getSnapshotsList();
    res.json(snapshots);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Full Snapshot Data for a Specific Round (JSON)
airdropRouter.get("/snapshots/:roundNumber", (req, res) => {
  const roundNum = parseInt(req.params.roundNumber, 10);
  if (isNaN(roundNum)) {
    return res.status(400).json({ error: "Invalid round number." });
  }

  try {
    const snapshot = airdropEngine.getSnapshotByRound(roundNum);
    if (!snapshot) {
      return res.status(404).json({ error: `Snapshot for Round ${roundNum} not found or round has not been completed yet.` });
    }
    res.json(snapshot);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download Snapshot as CSV for Easy Token Distribution / Airdrop Execution
airdropRouter.get("/snapshots/:roundNumber/csv", (req, res) => {
  const roundNum = parseInt(req.params.roundNumber, 10);
  if (isNaN(roundNum)) {
    return res.status(400).json({ error: "Invalid round number." });
  }

  try {
    const snapshot = airdropEngine.getSnapshotByRound(roundNum);
    if (!snapshot || !snapshot.users) {
      return res.status(404).json({ error: `Snapshot for Round ${roundNum} not found.` });
    }

    let csv = "Rank,User_ID,Username,First_Name,Wallet_Address,Airdrop_Points,Referral_Points,Total_Pixels\n";
    snapshot.users.forEach((u, index) => {
      const wallet = u.wallet_address || "NOT_CONNECTED";
      const username = u.username ? `@${u.username}` : "";
      const firstName = (u.first_name || "").replace(/,/g, " ");
      csv += `${index + 1},${u.id},"${username}","${firstName}","${wallet}",${u.airdrop_points || 0},${u.referral_points || 0},${u.total_pixels_placed || 0}\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="pixel_wars_round_${roundNum}_airdrop_snapshot.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});