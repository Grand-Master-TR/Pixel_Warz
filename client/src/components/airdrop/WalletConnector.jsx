import React, { useState } from "react";
import { useGame } from "../../context/GameContext.jsx";
import { useTelegram } from "../../context/TelegramContext.jsx";
import { api } from "../../services/api.js";
import { Wallet, CheckCircle2, ArrowRight, Edit3, ShieldCheck } from "lucide-react";

export function WalletConnector() {
  const { player, setPlayer, showToast } = useGame();
  const { haptic } = useTelegram();
  const [walletInput, setWalletInput] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const currentWallet = player?.walletAddress || null;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!walletInput.trim() || !player?.id) return;

    setIsSaving(true);
    haptic.impact("medium");

    try {
      const res = await api.saveWallet(player.id, walletInput.trim());
      if (res.success) {
        setPlayer((prev) => ({
          ...prev,
          walletAddress: res.walletAddress,
        }));
        setIsEditing(false);
        setWalletInput("");
        showToast("💎 TON Wallet Saved for Airdrop!", "success");
        haptic.notification("success");
      }
    } catch (err) {
      showToast(err.message || "Failed to save wallet", "error");
      haptic.notification("error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="arcade-box p-3.5 bg-[#141520] border-2 border-black flex flex-col gap-3 shadow-pixel">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-[#282c3c] border-2 border-black text-[#f59e0b]">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-pixel text-xs text-white uppercase">
              AIRDROP TON WALLET
            </h4>
            <p className="font-arcade text-xs text-slate-400">
              WHERE YOUR ROUND AIRDROPS WILL BE SENT
            </p>
          </div>
        </div>

        {currentWallet && !isEditing && (
          <span className="font-pixel text-[8px] bg-[#0f241a] text-[#34d399] px-2 py-1 border border-[#047857] flex items-center gap-1 font-bold">
            <CheckCircle2 className="w-3 h-3 text-[#10b981]" />
            ELIGIBLE
          </span>
        )}
      </div>

      {currentWallet && !isEditing ? (
        <div className="bg-[#181a24] p-2.5 border-2 border-black flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <ShieldCheck className="w-4 h-4 text-[#10b981] shrink-0" />
            <span className="font-arcade text-sm text-slate-200 truncate tracking-wide">
              {currentWallet.slice(0, 8)}...{currentWallet.slice(-6)}
            </span>
          </div>
          <button
            onClick={() => {
              setWalletInput(currentWallet);
              setIsEditing(true);
              haptic.impact("light");
            }}
            className="text-slate-400 hover:text-white p-1 ml-2 font-pixel text-[8px] flex items-center gap-1"
          >
            <Edit3 className="w-3 h-3" />
            <span>EDIT</span>
          </button>
        </div>
      ) : (
        <form onSubmit={handleSave} className="flex flex-col gap-2">
          <div className="relative">
            <input
              type="text"
              value={walletInput}
              onChange={(e) => setWalletInput(e.target.value)}
              placeholder="Paste TON Wallet (e.g. UQ... or EQ...)"
              className="w-full bg-[#181a24] border-2 border-[#282c3c] focus:border-[#f59e0b] px-3 py-2 text-xs font-arcade text-white placeholder:text-slate-500 outline-none"
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isSaving || !walletInput.trim()}
              className="flex-1 pixel-btn pixel-btn-emerald py-2 text-[10px] flex items-center justify-center gap-1.5"
            >
              {isSaving ? (
                <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Wallet className="w-3.5 h-3.5" />
                  <span>{currentWallet ? "UPDATE WALLET" : "SAVE WALLET FOR AIRDROP"}</span>
                </>
              )}
            </button>

            {isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="pixel-btn pixel-btn-dark py-2 px-3 text-[10px]"
              >
                CANCEL
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}