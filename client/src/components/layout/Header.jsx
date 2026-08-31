import React from "react";
import { useGame } from "../../context/GameContext.jsx";
import { useTelegram } from "../../context/TelegramContext.jsx";
import { Plus, Sparkles, Radio, Zap, Gift } from "lucide-react";

export function Header({ onOpenStore }) {
  const { player, onlineCount } = useGame();
  const { haptic } = useTelegram();

  return (
    <header className="w-full bg-[#0e1017] border-b-2 border-[#282c3c] px-3.5 py-2.5 flex items-center justify-between z-20 shadow-pixel-sm">
      {/* Brand & Online Status */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 bg-gradient-to-b from-[#f59e0b] to-[#b45309] border-2 border-black flex items-center justify-center shadow-pixel-sm">
          <span className="font-pixel text-[13px] text-black font-black">PW</span>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="font-pixel text-xs text-white tracking-wider">
              PIXEL WARS
            </h1>
            <span className="font-pixel text-[8px] bg-[#282c3c] text-[#f59e0b] px-1 py-0.2 border border-black">
              1M
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-[#10b981] font-arcade mt-0.5">
            <span className="w-2 h-2 bg-[#10b981] border border-black inline-block animate-pulse" />
            <span className="tracking-widest uppercase">{onlineCount} WARRIORS ONLINE</span>
          </div>
        </div>
      </div>

      {/* Economy Badges */}
      <div className="flex items-center gap-2">
        {/* Airdrop Points Badge */}
        <div className="bg-[#181a24] border border-[#282c3c] px-2.5 py-1 flex items-center gap-1.5 shadow-pixel-sm">
          <Sparkles className="w-3 h-3 text-[#f59e0b]" />
          <span className="font-pixel text-[10px] text-[#fbbf24]">
            {player?.airdropPoints?.toFixed(1) || "0.0"}
          </span>
          <span className="font-arcade text-[11px] text-slate-400">PTS</span>
        </div>

        {/* Pixel Balance Button */}
        <button
          onClick={() => {
            onOpenStore();
            haptic.impact("light");
          }}
          className="pixel-btn pixel-btn-gold px-2.5 py-1 flex items-center gap-1.5 text-[10px]"
          title="Buy Pixels / Watch Ads"
        >
          <span>{player?.pixelBalance ?? 3} PX</span>
          <Plus className="w-3 h-3 stroke-[3]" />
        </button>
      </div>
    </header>
  );
}