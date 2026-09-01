import express from "express";
import { airdropEngine } from "../services/airdropEngine.js";
import { db } from "../database/db.js";

export const airdropRouter = express.Router();

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