import express from "express";
import { validateTelegramInitData, getOrCreateUser, generateAuthToken, requireAuth } from "../services/auth.js";
import { db } from "../database/db.js";
import { CONFIG } from "../config.js";

export const userRouter = express.Router();

// Authenticate user with Telegram initData & generate signed auth token
userRouter.post("/auth", (req, res) => {
  const { initData, devUserId, devUsername, referrerId } = req.body;

  let tgUser = null;

  if (initData) {
    tgUser = validateTelegramInitData(initData);
  }

  // Fallback for development / browser testing only
  if (!tgUser && (devUserId || CONFIG.NODE_ENV === "development")) {
    const id = devUserId || "guest_1001";
    tgUser = {
      id: id,
      username: devUsername || `player_${id.slice(-4)}`,
      first_name: "Pixel Warrior",
    };
  }

  if (!tgUser) {
    return res.status(401).json({ error: "Invalid Telegram authentication data." });
  }

  try {
    const user = getOrCreateUser(tgUser, referrerId);
    const token = generateAuthToken(user.id);
    const refCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE referrer_id = ?").get(user.id).count;

    let completedTasks = [];
    try {
      completedTasks = JSON.parse(user.completed_tasks || "[]");
    } catch (e) {}

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        firstName: user.first_name,
        walletAddress: user.wallet_address || null,
        completedTasks,
        pixelBalance: user.pixel_balance,
        totalPixelsPlaced: user.total_pixels_placed,
        freshPixelsPlaced: user.fresh_pixels_placed,
        recoloredPixelsPlaced: user.recolored_pixels_placed,
        airdropPoints: user.airdrop_points,
        referralPoints: user.referral_points,
        referrerId: user.referrer_id,
        dailyStreak: user.daily_streak,
        lastDailyClaim: user.last_daily_claim,
        lastAdWatch: user.last_ad_watch,
        referralCount: refCount,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save / Update User's TON or Crypto Wallet Address for Airdrops (Protected)
userRouter.post("/save-wallet", requireAuth, (req, res) => {
  const userId = req.userId;
  const { walletAddress } = req.body;

  if (!walletAddress || typeof walletAddress !== "string") {
    return res.status(400).json({ error: "Invalid wallet address." });
  }

  const cleanAddress = walletAddress.trim();
  if (cleanAddress.length < 8 || cleanAddress.length > 120) {
    return res.status(400).json({ error: "Wallet address length must be between 8 and 120 characters." });
  }

  try {
    db.prepare("UPDATE users SET wallet_address = ? WHERE id = ?").run(cleanAddress, userId);
    console.log(`💳 Wallet linked for user ${userId}: ${cleanAddress}`);
    res.json({
      success: true,
      walletAddress: cleanAddress,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get List of Social Tasks and completion status (Protected)
userRouter.get("/tasks", requireAuth, (req, res) => {
  const userId = req.userId;
  const user = db.prepare("SELECT completed_tasks FROM users WHERE id = ?").get(userId);

  let completedTasks = [];
  try {
    completedTasks = JSON.parse(user?.completed_tasks || "[]");
  } catch (e) {}

  const tasksWithStatus = CONFIG.TASKS.map((t) => ({
    ...t,
    isCompleted: completedTasks.includes(t.id),
  }));

  res.json({
    tasks: tasksWithStatus,
    completedCount: completedTasks.length,
    totalAvailable: CONFIG.TASKS.length,
  });
});

// Complete a Task & Claim Pixel Reward (Protected)
userRouter.post("/complete-task", requireAuth, (req, res) => {
  const userId = req.userId;
  const { taskId } = req.body;

  const task = CONFIG.TASKS.find((t) => t.id === taskId);
  if (!task) {
    return res.status(400).json({ error: "Invalid task ID." });
  }

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  let completed = [];
  try {
    completed = JSON.parse(user.completed_tasks || "[]");
  } catch (e) {}

  if (completed.includes(taskId)) {
    return res.status(400).json({ error: "You have already completed this task." });
  }

  completed.push(taskId);
  const newBalance = user.pixel_balance + task.rewardPixels;

  try {
    db.transaction(() => {
      db.prepare("UPDATE users SET pixel_balance = ?, completed_tasks = ? WHERE id = ?")
        .run(newBalance, JSON.stringify(completed), userId);

      db.prepare(`
        INSERT INTO transactions (id, user_id, type, pixels_awarded, details, created_at)
        VALUES (?, ?, 'TASK_REWARD', ?, ?, ?)
      `).run(
        `task_${taskId}_${Date.now()}`,
        userId,
        task.rewardPixels,
        JSON.stringify({ taskId, taskTitle: task.title }),
        Math.floor(Date.now() / 1000)
      );
    })();

    console.log(`🎁 Task '${task.id}' claimed by user ${userId} (+${task.rewardPixels} PX)`);

    res.json({
      success: true,
      taskId,
      pixelsAdded: task.rewardPixels,
      newBalance,
      completedTasks: completed,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch latest profile state
userRouter.get("/profile/:id", (req, res) => {
  const userId = req.params.id;
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  const refCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE referrer_id = ?").get(user.id).count;
  let completedTasks = [];
  try {
    completedTasks = JSON.parse(user.completed_tasks || "[]");
  } catch (e) {}

  res.json({
    id: user.id,
    username: user.username,
    firstName: user.first_name,
    walletAddress: user.wallet_address || null,
    completedTasks,
    pixelBalance: user.pixel_balance,
    totalPixelsPlaced: user.total_pixels_placed,
    freshPixelsPlaced: user.fresh_pixels_placed,
    recoloredPixelsPlaced: user.recolored_pixels_placed,
    airdropPoints: user.airdrop_points,
    referralPoints: user.referral_points,
    referrerId: user.referrer_id,
    dailyStreak: user.daily_streak,
    lastDailyClaim: user.last_daily_claim,
    lastAdWatch: user.last_ad_watch,
    referralCount: refCount,
  });
});