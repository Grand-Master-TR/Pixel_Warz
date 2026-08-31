const API_BASE = import.meta.env.VITE_API_URL || "/api";

export const api = {
  // Download full 1MB Canvas as binary buffer
  async getCanvasBinary() {
    const res = await fetch(`${API_BASE}/canvas/binary`);
    if (!res.ok) throw new Error("Failed to load canvas data");
    return await res.arrayBuffer();
  },

  // Get canvas config & palette
  async getCanvasState() {
    const res = await fetch(`${API_BASE}/canvas/state`);
    return await res.json();
  },

  // Inspect pixel at (x, y)
  async getPixelInfo(x, y) {
    const res = await fetch(`${API_BASE}/canvas/pixel-info/${x}/${y}`);
    if (!res.ok) throw new Error("Failed to fetch pixel info");
    return await res.json();
  },

  // Batch place pixels
  async placePixels(userId, pixels) {
    const res = await fetch(`${API_BASE}/canvas/place-pixels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, pixels }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to place pixels");
    return data;
  },

  // Auth / Initialize user with Telegram initData
  async authUser({ initData, devUserId, devUsername, referrerId }) {
    const res = await fetch(`${API_BASE}/user/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ initData, devUserId, devUsername, referrerId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Auth failed");
    return data;
  },

  // Get user profile
  async getProfile(userId) {
    const res = await fetch(`${API_BASE}/user/profile/${userId}`);
    if (!res.ok) throw new Error("Failed to fetch profile");
    return await res.json();
  },

  // Store packages & pricing
  async getStorePackages() {
    const res = await fetch(`${API_BASE}/store/packages`);
    return await res.json();
  },

  // Watch Ad reward claim (AdsGram)
  async claimAdReward(userId) {
    const res = await fetch(`${API_BASE}/store/watch-ad`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to claim ad reward");
    return data;
  },

  // Claim Daily streak
  async claimDailyReward(userId) {
    const res = await fetch(`${API_BASE}/store/claim-daily`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to claim daily reward");
    return data;
  },

  // Create Stars invoice
  async createStarsInvoice(userId, packageId) {
    const res = await fetch(`${API_BASE}/store/create-invoice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, packageId }),
    });
    return await res.json();
  },

  // Simulate Stars purchase (testing / sandbox)
  async simulateStarsPurchase(userId, packageId) {
    const res = await fetch(`${API_BASE}/store/simulate-stars-purchase`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, packageId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Purchase failed");
    return data;
  },

  // Milestones
  async getMilestones() {
    const res = await fetch(`${API_BASE}/airdrop/milestones`);
    return await res.json();
  },

  // Leaderboard
  async getLeaderboard(limit = 100) {
    const res = await fetch(`${API_BASE}/airdrop/leaderboard?limit=${limit}`);
    return await res.json();
  },

  // Referrals
  async getReferralStats(userId) {
    const res = await fetch(`${API_BASE}/airdrop/referrals/${userId}`);
    return await res.json();
  },

  // Recent placements stream
  async getRecentActivity() {
    const res = await fetch(`${API_BASE}/airdrop/recent-activity`);
    return await res.json();
  },
};
