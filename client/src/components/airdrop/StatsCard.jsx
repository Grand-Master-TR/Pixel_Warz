import React from "react";
import { useGame } from "../../context/GameContext.jsx";
import { Sparkles, Repeat, Users, Flame } from "lucide-react";

export function StatsCard() {
  const { player } = useGame();

  if (!player) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {/* Total Points */}
      <div className="arcade-box p-3 bg-[#181a24] border-2 border-black flex flex-col justify-between shadow-pixel">
        <div className="flex items-center justify-between">
          <span className="font-pixel text-[8px] text-[#f59e0b] uppercase">TOTAL AIRDROP</span>
          <Sparkles className="w-3.5 h-3.5 text-[#f59e0b]" />
        </div>
        <div className="mt-2">
          <span className="font-arcade text-2xl font-bold text-white tracking-wider">
            {player.airdropPoints?.toFixed(1) || "0.0"}
          </span>
          <span className="font-pixel text-[7px] text-slate-400 block mt-0.5">POINTS EARNED</span>
        </div>
      </div>

      {/* Fresh Pixels */}
      <div className="arcade-box p-3 bg-[#0f241a] border-2 border-black flex flex-col justify-between shadow-pixel">
        <div className="flex items-center justify-between">
          <span className="font-pixel text-[8px] text-[#34d399] uppercase">FRESH PIXELS</span>
          <Flame className="w-3.5 h-3.5 text-[#10b981]" />
        </div>
        <div className="mt-2">
          <span className="font-arcade text-2xl font-bold text-[#34d399] tracking-wider">
            {player.freshPixelsPlaced || 0}
          </span>
          <span className="font-pixel text-[7px] text-emerald-400 block mt-0.5">+10.0 PTS EACH</span>
        </div>
      </div>

      {/* Recolor Overwrites */}
      <div className="arcade-box p-3 bg-[#2e1515] border-2 border-black flex flex-col justify-between shadow-pixel">
        <div className="flex items-center justify-between">
          <span className="font-pixel text-[8px] text-[#f87171] uppercase">RECOLORS</span>
          <Repeat className="w-3.5 h-3.5 text-[#ef4444]" />
        </div>
        <div className="mt-2">
          <span className="font-arcade text-2xl font-bold text-[#f87171] tracking-wider">
            {player.recoloredPixelsPlaced || 0}
          </span>
          <span className="font-pixel text-[7px] text-rose-400 block mt-0.5">+15.0 PTS (50% BONUS)</span>
        </div>
      </div>

      {/* Referral Bonus */}
      <div className="arcade-box p-3 bg-[#1e152d] border-2 border-black flex flex-col justify-between shadow-pixel">
        <div className="flex items-center justify-between">
          <span className="font-pixel text-[8px] text-[#a78bfa] uppercase">GUILD CUT</span>
          <Users className="w-3.5 h-3.5 text-[#8b5cf6]" />
        </div>
        <div className="mt-2">
          <span className="font-arcade text-2xl font-bold text-[#a78bfa] tracking-wider">
            {player.referralPoints?.toFixed(1) || "0.0"}
          </span>
          <span className="font-pixel text-[7px] text-purple-400 block mt-0.5">10% COMMISSION</span>
        </div>
      </div>
    </div>
  );
}