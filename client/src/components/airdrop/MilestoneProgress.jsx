import React, { useState } from "react";
import { useGame } from "../../context/GameContext.jsx";
import { Award, Zap, ChevronRight, CheckCircle, Lock, Target } from "lucide-react";

export function MilestoneProgress() {
  const { milestones } = useGame();
  const [showAllRounds, setShowAllRounds] = useState(false);

  if (!milestones) {
    return (
      <div className="arcade-box p-4 animate-pulse flex flex-col gap-2">
        <div className="h-4 bg-[#282c3c] w-1/3" />
        <div className="h-6 bg-[#282c3c] w-full" />
      </div>
    );
  }

  const {
    globalPixelsPlaced,
    activeRoundNumber,
    activeRoundTarget,
    progressPercent,
    maxRounds,
    allRounds,
  } = milestones;

  return (
    <div className="arcade-box p-3.5 bg-[#12141c] border-2 border-black flex flex-col gap-3 shadow-pixel">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-[#282c3c] border-2 border-black text-[#f59e0b]">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-pixel text-xs text-white uppercase">
              ROUND {activeRoundNumber} OF {maxRounds}
            </h3>
            <p className="font-arcade text-xs text-slate-400">5 BILLION PIXELS GLOBAL AIRDROP POOL</p>
          </div>
        </div>

        <button
          onClick={() => setShowAllRounds(!showAllRounds)}
          className="font-pixel text-[8px] text-[#f59e0b] bg-[#1f1912] px-2 py-1 border border-[#d97706] flex items-center gap-1 uppercase"
        >
          <span>{showAllRounds ? "HIDE" : "50 ROUNDS"}</span>
          <ChevronRight className={`w-3 h-3 transition-transform ${showAllRounds ? "rotate-90" : ""}`} />
        </button>
      </div>

      {/* Progress Bar Board */}
      <div className="bg-[#181a24] p-3 border-2 border-black flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-pixel text-[8px] text-slate-300 flex items-center gap-1 uppercase">
            <Target className="w-3 h-3 text-[#f59e0b]" />
            <span>ROUND {activeRoundNumber} GOAL: <strong>{(activeRoundTarget / 1000000).toFixed(0)}M PIXELS</strong></span>
          </span>
          <span className="font-arcade text-sm text-[#10b981] font-bold tracking-wider">{progressPercent.toFixed(1)}%</span>
        </div>

        {/* Retro Striped Progress Bar */}
        <div className="w-full h-4 bg-black border-2 border-[#282c3c] p-0.5">
          <div
            className="h-full bg-gradient-to-r from-[#f59e0b] via-[#10b981] to-[#34d399] transition-all duration-500"
            style={{ width: `${Math.max(2, Math.min(100, progressPercent))}%` }}
          />
        </div>

        <div className="flex items-center justify-between font-arcade text-xs text-slate-400">
          <span>GLOBAL PLACED: {globalPixelsPlaced.toLocaleString()} PX</span>
          <span>TARGET: {activeRoundTarget.toLocaleString()} PX</span>
        </div>
      </div>

      {/* 50 Rounds Roadmap Drawer */}
      {showAllRounds && (
        <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
          <span className="font-pixel text-[8px] text-slate-400 uppercase tracking-wider">
            ALL 50 AIRDROP MILESTONES (5B PIXELS)
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {allRounds?.map((r) => {
              const isCompleted = r.status === "COMPLETED";
              const isActive = r.status === "ACTIVE";

              return (
                <div
                  key={r.round_number}
                  className={`p-2 border-2 flex items-center justify-between text-xs ${
                    isCompleted
                      ? "bg-[#0f241a] border-[#047857] text-[#34d399]"
                      : isActive
                      ? "bg-[#1f1912] border-[#f59e0b] text-[#fbbf24] shadow-pixel-sm"
                      : "bg-[#181a24] border-[#282c3c] text-slate-500"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {isCompleted ? (
                      <CheckCircle className="w-3.5 h-3.5 text-[#10b981]" />
                    ) : isActive ? (
                      <Zap className="w-3.5 h-3.5 text-[#f59e0b] animate-bounce" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-slate-600" />
                    )}
                    <span className="font-pixel text-[8px]">ROUND {r.round_number}</span>
                  </div>
                  <span className="font-arcade text-xs font-bold">
                    {(r.target_pixels / 1000000).toFixed(0)}M PX
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}