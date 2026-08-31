import express from "express";
import { airdropEngine } from "../services/airdropEngine.js";
import { db } from "../database/db.js";
import { CONFIG } from "../config.js";

export const airdropRouter = express.Router();

// Get Milestone Rounds Progress (50 Rounds, 10M to 500M)
airdropRouter.get("/milestones", (req, res) => {
  try {
    const stats = airdropEngine.getMilestoneStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Top 100 Leaderboard by Airdrop Points
airdropRouter.get("/leaderboard", (req, res) => {
  try {
    const limit = parseInt(req.query.limit || "100", 10);
    const leaders = airdropEngine.getLeaderboard(limit);
    res.json({ leaderboard: leaders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Referral stats for a specific user
airdropRouter.get("/referrals/:userId", (req, res) => {
  const userId = req.params.userId;
  if (!userId) return res.status(400).json({ error: "userId is required." });

  try {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    if (!user) return res.status(404).json({ error: "User not found." });

    const referrals = db.prepare(`
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
    `).all(userId);

    // Calculate total commissions received from logs
    const totalCommissionsEarned = user.referral_points;

    res.json({
      referralCount: referrals.length,
      totalCommissionPoints: totalCommissionsEarned,
      commissionRatePercent: CONFIG.POINTS.REFERRAL_RATE * 100, // 10%
      referrals: referrals.map((r) => ({
        id: r.id,
        name: r.username ? `@${r.username}` : (r.first_name || "Pixel Player"),
        pointsEarned: r.airdrop_points,
        bonusGivenToYou: r.airdrop_points * CONFIG.POINTS.REFERRAL_RATE,
        totalPixelsPlaced: r.total_pixels_placed,
        joinedAt: r.created_at,
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Live global recent pixel activity stream
airdropRouter.get("/recent-activity", (req, res) => {
  try {
    const recent = db.prepare(`
      SELECT 
        l.id, 
        l.x, 
        l.y, 
        l.color_index, 
        l.is_recolor, 
        l.points_awarded, 
        l.created_at,
        u.username,
        u.first_name
      FROM placements_log l
      LEFT JOIN users u ON l.user_id = u.id
      ORDER BY l.id DESC
      LIMIT 30
    `).all();

    res.json({
      recent: recent.map((r) => ({
        id: r.id,
        x: r.x,
        y: r.y,
        colorHex: CONFIG.PALETTE[r.color_index] || "#FFFFFF",
        isRecolor: !!r.is_recolor,
        points: r.points_awarded,
        user: r.username ? `@${r.username}` : (r.first_name || "Warrior"),
        time: r.created_at
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
