import React, { useState } from "react";
import { useGame } from "../../context/GameContext.jsx";
import { useTelegram } from "../../context/TelegramContext.jsx";
import { api } from "../../services/api.js";
import { Star, ShieldCheck, Sparkles } from "lucide-react";

export function StarsShop() {
  const { player, setPlayer, showToast, refreshProfile } = useGame();
  const { isTelegram, openInvoice, haptic } = useTelegram();
  const [purchasingId, setPurchasingId] = useState(null);

  // 10x Pixels for Stars Packages
  const packages = [
    { id: "stars_1", stars: 1, pixels: 100, bonus: null, label: "Starter Pixel Pouch", icon: "🪙" },
    { id: "stars_10", stars: 10, pixels: 1000, bonus: null, label: "Colorist Box", icon: "🎨", popular: true },
    { id: "stars_50", stars: 50, pixels: 5500, bonus: "+10% EXTRA", label: "Painter Bundle", icon: "⚡" },
    { id: "stars_100", stars: 100, pixels: 12000, bonus: "+20% EXTRA", label: "Master Canvas Chest", icon: "💎" },
    { id: "stars_500", stars: 500, pixels: 65000, bonus: "+30% EXTRA", label: "Warlord Treasury", icon: "👑", bestValue: true },
  ];

  const handlePurchase = async (pkg) => {
    if (!player) return;
    setPurchasingId(pkg.id);
    haptic.impact("medium");

    try {
      // Step 1: Create official Telegram Stars Invoice Link on server
      const invRes = await api.createStarsInvoice(player.id, pkg.id);

      if (invRes.invoiceLink) {
        if (isTelegram && !invRes.isSimulation) {
          // Step 2: Open Native Telegram Stars Checkout Sheet
          openInvoice(invRes.invoiceLink, async (status) => {
            if (status === "paid") {
              await refreshProfile();
              showToast(`🎉 Purchased +${pkg.pixels.toLocaleString()} Pixels!`, "success");
              haptic.notification("success");
            } else if (status === "failed") {
              showToast("Payment failed or was cancelled.", "error");
            }
          });
        } else {
          // Dev / Browser Sandbox Simulation
          const simRes = await api.simulateStarsPurchase(player.id, pkg.id);
          if (simRes.success) {
            setPlayer((prev) => ({
              ...prev,
              pixelBalance: simRes.newBalance,
            }));
            showToast(`⭐ Credited +${pkg.pixels.toLocaleString()} Pixels!`, "success");
            haptic.notification("success");
          }
        }
      }
    } catch (err) {
      console.error("Purchase error:", err);
      showToast(err.message || "Could not open Stars checkout", "error");
      haptic.notification("error");
    } finally {
      setPurchasingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b-2 border-[#282c3c] pb-2">
        <div>
          <h3 className="font-pixel text-xs text-[#f59e0b] flex items-center gap-1.5 uppercase">
            <Star className="w-3.5 h-3.5 fill-[#f59e0b]" />
            <span>STARS PIXEL SHOP</span>
          </h3>
          <p className="font-arcade text-xs text-slate-400 mt-0.5">1 TELEGRAM STAR = 100 PIXELS + BONUS</p>
        </div>
        <div className="flex items-center gap-1 font-pixel text-[8px] text-[#10b981] bg-[#0f241a] px-2 py-1 border border-[#047857]">
          <ShieldCheck className="w-3 h-3" />
          <span>INSTANT</span>
        </div>
      </div>

      {/* Package List */}
      <div className="flex flex-col gap-2.5">
        {packages.map((pkg) => {
          const isBuying = purchasingId === pkg.id;
          return (
            <div
              key={pkg.id}
              className={`relative arcade-box p-3 border-2 border-black flex items-center justify-between transition-all ${
                pkg.popular
                  ? "bg-[#181a24] border-[#f59e0b]"
                  : pkg.bestValue
                  ? "bg-[#1f1912] border-[#f59e0b]"
                  : "bg-[#12141c]"
              }`}
            >
              {pkg.popular && (
                <span className="absolute -top-2.5 left-3 bg-[#f59e0b] text-black font-pixel text-[7px] font-black px-1.5 py-0.5 border border-black shadow-pixel-sm">
                  POPULAR
                </span>
              )}
              {pkg.bestValue && (
                <span className="absolute -top-2.5 left-3 bg-[#10b981] text-black font-pixel text-[7px] font-black px-1.5 py-0.5 border border-black shadow-pixel-sm">
                  BEST VALUE
                </span>
              )}

              <div className="flex items-center gap-3">
                <div className="text-2xl">{pkg.icon}</div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-pixel text-xs text-white">{pkg.pixels.toLocaleString()} PIXELS</span>
                    {pkg.bonus && (
                      <span className="font-pixel text-[7px] text-[#10b981] bg-[#0f241a] px-1 py-0.2 border border-[#047857]">
                        {pkg.bonus}
                      </span>
                    )}
                  </div>
                  <span className="font-arcade text-xs text-slate-400 block">{pkg.label}</span>
                </div>
              </div>

              <button
                onClick={() => handlePurchase(pkg)}
                disabled={isBuying}
                className="pixel-btn pixel-btn-gold px-3.5 py-1.5 flex items-center gap-1.5 text-[10px]"
              >
                {isBuying ? (
                  <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Star className="w-3.5 h-3.5 fill-black" />
                    <span>{pkg.stars} {pkg.stars === 1 ? "STAR" : "STARS"}</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}