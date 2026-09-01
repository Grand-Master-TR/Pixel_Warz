import React, { useState, useEffect } from "react";
import { useGame } from "../../context/GameContext.jsx";
import { useTelegram } from "../../context/TelegramContext.jsx";
import { adsgram } from "../../services/adsgram.js";
import { api } from "../../services/api.js";
import { Tv, Play, Clock } from "lucide-react";

export function AdsGramPlayer() {
  const { player, setPlayer, showToast } = useGame();
  const { haptic } = useTelegram();
  const [isWatching, setIsWatching] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);

  useEffect(() => {
    if (!player?.lastAdWatch) return;

    const checkCooldown = () => {
      const now = Math.floor(Date.now() / 1000);
      const elapsed = now - player.lastAdWatch;
      const left = Math.max(0, 30 - elapsed);
      setCooldownLeft(left);
    };

    checkCooldown();
    const timer = setInterval(checkCooldown, 1000);
    return () => clearInterval(timer);
  }, [player?.lastAdWatch]);

  const handleWatchAd = async () => {
    if (!player || cooldownLeft > 0 || isWatching) return;

    setIsWatching(true);
    haptic.impact("medium");

    try {
      const adResult = await adsgram.showRewardedVideo();

      if (adResult.success) {
        const rewardRes = await api.claimAdReward(player.id);
        if (rewardRes?.success) {
          setPlayer((prev) => ({
            ...prev,
            pixelBalance: rewardRes.newBalance,
            lastAdWatch: Math.floor(Date.now() / 1000),
          }));
          showToast(`📺 Ad Completed! +${rewardRes.pixelsAdded || 10} Free Pixels`, "success");
          haptic.notification("success");
        }
      } else {
        showToast("Ad was not completed.", "error");
      }
    } catch (err) {
      console.error("Ad reward error:", err);
      showToast(err.message || "Failed to watch ad", "error");
      haptic.notification("error");
    } finally {
      setIsWatching(false);
    }
  };

  return (
    <div className="arcade-box p-3.5 bg-[#141520] border-2 border-black flex flex-col gap-3 shadow-pixel">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#282c3c] border-2 border-black text-[#f59e0b]">
            <Tv className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="font-pixel text-xs text-white uppercase">
                REWARDED VIDEO AD
              </h4>
              <span className="font-pixel text-[7px] bg-[#10b981] text-black px-1 py-0.2 font-black">
                FREE
              </span>
            </div>
            <p className="font-arcade text-xs text-slate-400">WATCH 1 AD → EARN +10 FREE PIXELS</p>
          </div>
        </div>

        <button
          onClick={handleWatchAd}
          disabled={cooldownLeft > 0 || isWatching}
          className={`pixel-btn px-3 py-2 text-[9px] flex items-center gap-1.5 ${
            cooldownLeft > 0
              ? "pixel-btn-dark opacity-60 cursor-not-allowed"
              : "pixel-btn-violet"
          }`}
        >
          {isWatching ? (
            <>
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>PLAYING...</span>
            </>
          ) : cooldownLeft > 0 ? (
            <>
              <Clock className="w-3 h-3" />
              <span>WAIT {cooldownLeft}S</span>
            </>
          ) : (
            <>
              <Play className="w-3 h-3 fill-white" />
              <span>WATCH (+10 PX)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}