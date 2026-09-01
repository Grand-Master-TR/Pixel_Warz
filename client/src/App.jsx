import React, { useState } from "react";
import { useGame } from "./context/GameContext.jsx";
import { Header } from "./components/layout/Header.jsx";
import { Navigation } from "./components/layout/Navigation.jsx";
import { PixelCanvas } from "./components/canvas/PixelCanvas.jsx";
import { PaletteBar } from "./components/canvas/PaletteBar.jsx";
import { PendingTray } from "./components/canvas/PendingTray.jsx";
import { PixelInspector } from "./components/canvas/PixelInspector.jsx";
import { MiniMap } from "./components/canvas/MiniMap.jsx";
import { StarsShop } from "./components/store/StarsShop.jsx";
import { AdsGramPlayer } from "./components/store/AdsGramPlayer.jsx";
import { DailyClaim } from "./components/store/DailyClaim.jsx";
import { WalletConnector } from "./components/airdrop/WalletConnector.jsx";
import { MilestoneProgress } from "./components/airdrop/MilestoneProgress.jsx";
import { StatsCard } from "./components/airdrop/StatsCard.jsx";
import { Leaderboard } from "./components/airdrop/Leaderboard.jsx";
import { ReferralHub } from "./components/referrals/ReferralHub.jsx";
import { AlertCircle, CheckCircle2, Sparkles, Gift, X } from "lucide-react";

export function App() {
  const { isLoading, toast, player } = useGame();
  const [activeTab, setActiveTab] = useState("canvas");
  const [showStarterBanner, setShowStarterBanner] = useState(true);

  if (isLoading) {
    return (
      <div className="w-screen h-screen bg-[#0a0b0e] flex flex-col items-center justify-center gap-4 text-white">
        <div className="relative">
          <div className="w-14 h-14 bg-[#181a24] border-4 border-black flex items-center justify-center shadow-pixel animate-pulse">
            <span className="font-pixel text-xl text-[#f59e0b]">PW</span>
          </div>
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#10b981] border-2 border-black animate-ping" />
        </div>
        <div className="text-center">
          <h2 className="font-pixel text-sm text-white tracking-widest uppercase">PIXEL WARS</h2>
          <p className="font-arcade text-sm text-[#f59e0b] mt-1">LOADING 1,000,000 CANVAS GRID...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen bg-[#0a0b0e] flex flex-col overflow-hidden text-slate-100 font-sans">
      {/* Toast Notifications */}
      {toast && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 animate-bounce-short">
          <div
            className={`px-3.5 py-1.5 border-2 border-black shadow-pixel flex items-center gap-2 font-pixel text-[9px] uppercase ${
              toast.type === "success"
                ? "bg-[#0f241a] text-[#34d399] border-[#047857]"
                : toast.type === "error"
                ? "bg-[#2e1515] text-[#f87171] border-[#991b1b]"
                : "bg-[#181a24] text-[#fbbf24] border-[#f59e0b]"
            }`}
          >
            {toast.type === "success" && <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]" />}
            {toast.type === "error" && <AlertCircle className="w-3.5 h-3.5 text-[#ef4444]" />}
            {toast.type === "info" && <Sparkles className="w-3.5 h-3.5 text-[#f59e0b]" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Top Header */}
      <Header onOpenStore={() => setActiveTab("store")} />

      {/* 10 Free Starter Pixels Banner */}
      {showStarterBanner && player && player.totalPixelsPlaced === 0 && (
        <div className="bg-[#181a24] border-b-2 border-[#282c3c] px-3 py-1.5 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <Gift className="w-3.5 h-3.5 text-[#f59e0b]" />
            <span className="font-pixel text-[8px] text-[#fbbf24] uppercase">
              🎁 10 FREE STARTER PIXELS READY! DRAW YOUR FIRST MARK
            </span>
          </div>
          <button
            onClick={() => setShowStarterBanner(false)}
            className="text-slate-400 hover:text-white p-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Main Tab Content */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        {activeTab === "canvas" && (
          <div className="relative w-full h-full flex flex-col justify-between">
            {/* Interactive 1M Canvas */}
            <div className="absolute inset-0 z-0">
              <PixelCanvas />
            </div>

            {/* Pixel Inspector Popover */}
            <PixelInspector />

            {/* MiniMap Radar */}
            <MiniMap />

            {/* Floating Controls at Bottom of Canvas */}
            <div className="relative z-10 mt-auto flex flex-col gap-2 pb-2">
              <PendingTray onOpenStore={() => setActiveTab("store")} />
              <PaletteBar />
            </div>
          </div>
        )}

        {activeTab === "store" && (
          <div className="w-full h-full overflow-y-auto p-3.5 flex flex-col gap-3.5 max-w-lg mx-auto pb-10">
            <DailyClaim />
            <AdsGramPlayer />
            <StarsShop />
          </div>
        )}

        {activeTab === "airdrop" && (
          <div className="w-full h-full overflow-y-auto p-3.5 flex flex-col gap-3.5 max-w-lg mx-auto pb-10">
            <WalletConnector />
            <StatsCard />
            <MilestoneProgress />
            <Leaderboard />
          </div>
        )}

        {activeTab === "referrals" && (
          <div className="w-full h-full overflow-y-auto p-3.5 flex flex-col gap-3.5 max-w-lg mx-auto pb-10">
            <ReferralHub />
          </div>
        )}
      </main>

      {/* Bottom Tab Bar */}
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}