import React, { useState } from "react";
import { useGame } from "../../context/GameContext.jsx";
import { useTelegram } from "../../context/TelegramContext.jsx";
import { api } from "../../services/api.js";
import { Calendar, Gift, Check, Flame } from "lucide-react";

export function DailyClaim() {
  const { player, setPlayer, showToast } = useGame();
  const { haptic } = useTelegram();
  const [isClaiming, setIsClaiming] = useState(false);

  const streak = player?.dailyStreak || 0;
  const lastClaim = player?.lastDailyClaim || 0;
  const now = Math.floor(Date.now() / 1000);
  const isClaimable = now - lastClaim >= 72000 || lastClaim === 0;

  // 10x Daily Streak Rewards: Day 1-7 (10, 10, 20, 20, 30, 30, 50 pixels)
  const streakDays = [
    { day: 1, pixels: 10 },
    { day: 2, pixels: 10 },
    { day: 3, pixels: 20 },
    { day: 4, pixels: 20 },
    { day: 5, pixels: 30 },
    { day: 6, pixels: 30 },
    { day: 7, pixels: 50 },
  ];

  const currentDayIndex = streak % 7;
  const nextRewardPixels = streakDays[currentDayIndex]?.pixels || 10;

  const handleClaim = async () => {
    if (!player || !isClaimable || isClaiming) return;

    setIsClaiming(true);
    haptic.impact("medium");

    try {
      const res = await api.claimDailyReward(player.id);
      if (res.success) {
        setPlayer((prev) => ({
          ...prev,
          pixelBalance: res.newBalance,
          dailyStreak: res.streakDay,
          lastDailyClaim: Math.floor(Date.now() / 1000),
        }));
        showToast(`🎁 Claimed Day ${res.streakDay} Bonus: +${res.pixelsAdded} Pixels!`, "success");
        haptic.notification("success");
      }
    } catch (err) {
      showToast(err.message || "Failed to claim reward", "error");
      haptic.notification("error");
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="arcade-box p-3.5 bg-[#12141c] border-2 border-black flex flex-col gap-3 shadow-pixel">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-[#f59e0b]" />
          <h4 className="font-pixel text-xs text-white uppercase">DAILY CHECK-IN STREAK</h4>
        </div>
        <div className="flex items-center gap-1 font-pixel text-[8px] text-[#f59e0b] bg-[#1f1912] px-2 py-0.5 border border-[#d97706]">
          <Flame className="w-3 h-3 fill-[#f59e0b]" />
          <span>DAY {streak} STREAK</span>
        </div>
      </div>

      {/* 7 Day Streak Grid */}
      <div className="grid grid-cols-7 gap-1 pt-1">
        {streakDays.map((d) => {
          const isDone = streak >= d.day;
          const isCurrent = (streak % 7) + 1 === d.day && isClaimable;

          return (
            <div
              key={d.day}
              className={`flex flex-col items-center justify-center p-1.5 border-2 text-center transition ${
                isDone
                  ? "bg-[#0f241a] border-[#047857] text-[#34d399]"
                  : isCurrent
                  ? "bg-[#1f1912] border-[#f59e0b] text-[#fbbf24] shadow-pixel-sm animate-pulse"
                  : "bg-[#181a24] border-[#282c3c] text-slate-500"
              }`}
            >
              <span className="font-pixel text-[7px]">D{d.day}</span>
              <span className="font-arcade text-xs font-bold my-0.5">+{d.pixels}</span>
              {isDone ? (
                <Check className="w-3 h-3 text-[#10b981]" />
              ) : (
                <Gift className="w-3 h-3 text-slate-600" />
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={handleClaim}
        disabled={!isClaimable || isClaiming}
        className={`w-full py-2.5 text-xs font-pixel uppercase ${
          isClaimable
            ? "pixel-btn pixel-btn-emerald"
            : "pixel-btn pixel-btn-dark opacity-60 cursor-not-allowed"
        }`}
      >
        {isClaiming ? (
          <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto" />
        ) : isClaimable ? (
          <span>CLAIM DAILY BONUS (+{nextRewardPixels} PX)</span>
        ) : (
          <span>CLAIMED TODAY (NEXT DROP TOMORROW)</span>
        )}
      </button>
    </div>
  );
}