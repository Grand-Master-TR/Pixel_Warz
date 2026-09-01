import React, { useEffect, useState } from "react";
import { useGame } from "../../context/GameContext.jsx";
import { useTelegram } from "../../context/TelegramContext.jsx";
import { api } from "../../services/api.js";
import { Users, Copy, Share2, Check, Gift } from "lucide-react";

export function ReferralHub() {
  const { player, showToast } = useGame();
  const { shareTelegramLink, haptic } = useTelegram();
  const [copied, setCopied] = useState(false);
  const [refData, setRefData] = useState(null);

  // Exact registered bot username
  const botUsername = import.meta.env.VITE_BOT_USERNAME || "Pixel_Warz_bot";
  const refLink = `https://t.me/${botUsername}?startapp=ref_${player?.id || "12345"}`;

  useEffect(() => {
    if (player?.id) {
      api.getReferralStats(player.id)
        .then((data) => setRefData(data))
        .catch((err) => console.warn("Referrals error:", err));
    }
  }, [player?.id]);

  const handleCopy = () => {
    navigator.clipboard.writeText(refLink);
    setCopied(true);
    haptic.notification("success");
    showToast("📋 Referral link copied to clipboard!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    haptic.impact("medium");
    const shareText = "👾 Join me on Pixel Wars! Paint on the 1,000,000-pixel canvas and claim 10 Free Starter Pixels! Earn your share of the 50-Round Milestone Airdrop:";
    shareTelegramLink(refLink, shareText);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Hero Banner */}
      <div className="arcade-box p-4 bg-[#14121d] border-2 border-black flex flex-col gap-3 shadow-pixel">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#251b38] border-2 border-black text-[#a78bfa]">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-pixel text-xs text-white uppercase">RECRUIT GUILD & EARN 10%</h3>
            <p className="font-arcade text-xs text-slate-300 mt-0.5">
              INVITE FRIENDS → GET <strong>10% OF ALL AIRDROP POINTS</strong> THEY EARN FOREVER!
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#282c3c]">
          <div className="bg-[#181a24] p-2 border border-black text-center">
            <span className="font-pixel text-[8px] text-slate-400 block">RECRUITS</span>
            <span className="font-arcade text-xl font-bold text-white">
              {refData?.totalRecruits || player?.referralCount || 0}
            </span>
          </div>

          <div className="bg-[#181a24] p-2 border border-black text-center">
            <span className="font-pixel text-[8px] text-[#a78bfa] block">10% COMMISSION</span>
            <span className="font-arcade text-xl font-bold text-[#a78bfa]">
              +{(refData?.totalCommissionEarned || player?.referralPoints || 0).toFixed(1)} PTS
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleShare}
            className="flex-1 pixel-btn pixel-btn-violet py-2.5 px-3 flex items-center justify-center gap-2 text-xs"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>INVITE ON TELEGRAM</span>
          </button>

          <button
            onClick={handleCopy}
            className="pixel-btn pixel-btn-dark p-2.5 flex items-center justify-center text-slate-300 hover:text-white"
            title="Copy Link"
          >
            {copied ? <Check className="w-4 h-4 text-[#10b981]" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Recruits List */}
      <div className="arcade-box p-3.5 bg-[#12141c] border-2 border-black flex flex-col gap-2.5 shadow-pixel">
        <div className="flex items-center justify-between border-b border-[#282c3c] pb-2">
          <h4 className="font-pixel text-xs text-white flex items-center gap-1.5 uppercase">
            <Users className="w-3.5 h-3.5 text-[#a78bfa]" />
            <span>YOUR GUILD ({refData?.recruits?.length || 0})</span>
          </h4>
          <span className="font-pixel text-[8px] text-[#a78bfa] bg-[#251b38] px-2 py-0.5 border border-[#7c3aed]">
            10% CUT
          </span>
        </div>

        {refData?.recruits && refData.recruits.length > 0 ? (
          <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
            {refData.recruits.map((friend) => (
              <div
                key={friend.id}
                className="flex items-center justify-between p-2 bg-[#181a24] border border-[#282c3c] text-xs"
              >
                <div>
                  <span className="font-pixel text-[9px] text-white block">
                    {friend.username ? `@${friend.username}` : friend.first_name || "Warrior"}
                  </span>
                  <span className="font-arcade text-xs text-slate-400">
                    {friend.total_pixels_placed || 0} PX PLACED ({(friend.airdrop_points || 0).toFixed(1)} PTS)
                  </span>
                </div>

                <div className="text-right">
                  <span className="font-arcade text-base font-bold text-[#a78bfa]">
                    +{((friend.airdrop_points || 0) * 0.10).toFixed(1)} PTS
                  </span>
                  <span className="font-pixel text-[7px] text-slate-500 block">YOUR 10% CUT</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-slate-400 font-arcade text-sm flex flex-col items-center gap-1.5">
            <Users className="w-8 h-8 text-slate-600 stroke-1" />
            <p className="text-slate-300">NO RECRUITS YET.</p>
            <p className="text-xs text-slate-500">
              SHARE YOUR LINK TO START RECEIVING 10% PASSIVE COMMISSION!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}