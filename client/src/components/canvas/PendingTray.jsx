import React from "react";
import { useGame } from "../../context/GameContext.jsx";
import { Sparkles, Trash2, CheckCircle2, AlertCircle } from "lucide-react";

export function PendingTray({ onOpenStore }) {
  const {
    pendingPixels,
    pendingSummary,
    clearPendingPixels,
    submitPendingPixels,
    isSubmitting,
    player,
  } = useGame();

  if (pendingPixels.size === 0) return null;

  const hasEnoughPixels = player && player.pixelBalance >= pendingSummary.count;
  const missingPixels = player ? Math.max(0, pendingSummary.count - player.pixelBalance) : 0;

  return (
    <div className="w-full max-w-lg mx-auto px-3 pb-1">
      <div className="arcade-box p-3 border-2 border-black bg-[#161822] flex flex-col gap-2.5 shadow-pixel">
        {/* Top Summary Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-pixel text-[10px] text-[#f59e0b] uppercase">
              {pendingSummary.count} {pendingSummary.count === 1 ? "Pixel" : "Pixels"} Staged
            </span>
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-1.5 font-arcade text-xs">
              {pendingSummary.freshCount > 0 && (
                <span className="bg-[#0f241a] text-[#34d399] px-1.5 py-0.2 border border-[#047857]">
                  {pendingSummary.freshCount} Fresh (+{(pendingSummary.freshCount * 1.0).toFixed(1)} pts)
                </span>
              )}
              {pendingSummary.recolorCount > 0 && (
                <span className="bg-[#2e1515] text-[#f87171] px-1.5 py-0.2 border border-[#991b1b] font-bold">
                  🔥 {pendingSummary.recolorCount} Recolor (+{(pendingSummary.recolorCount * 1.5).toFixed(1)} pts)
                </span>
              )}
            </div>
          </div>

          <button
            onClick={clearPendingPixels}
            className="text-slate-400 hover:text-[#ef4444] p-1 transition"
            title="Clear Staged Pixels"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2">
          {hasEnoughPixels ? (
            <button
              onClick={submitPendingPixels}
              disabled={isSubmitting}
              className="w-full pixel-btn pixel-btn-emerald py-2.5 px-4 flex items-center justify-center gap-2 text-xs"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>PAINT {pendingSummary.count} PIXELS</span>
                  <span className="bg-black/20 px-1.5 py-0.2 font-pixel text-[9px] ml-1">
                    +{pendingSummary.totalPoints.toFixed(1)} PTS
                  </span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={onOpenStore}
              className="w-full pixel-btn pixel-btn-crimson py-2.5 px-4 flex items-center justify-center gap-2 text-xs"
            >
              <AlertCircle className="w-4 h-4" />
              <span>NEED {missingPixels} MORE PIXELS (GET MORE)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}