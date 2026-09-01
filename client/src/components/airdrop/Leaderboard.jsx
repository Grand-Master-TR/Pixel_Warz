import React, { useEffect, useState } from "react";
import { api } from "../../services/api.js";
import { sound } from "../../services/sound.js";
import { Trophy, Medal, Crown, RefreshCw } from "lucide-react";

export function Leaderboard() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaders = async () => {
    setLoading(true);
    try {
      const data = await api.getLeaderboard(50);
      const list = Array.isArray(data) ? data : (data?.leaderboard || []);
      setLeaders(list);
    } catch (err) {
      console.warn("Leaderboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaders();
  }, []);

  const getRankBadge = (index) => {
    if (index === 0) {
      return (
        <div className="w-6 h-6 bg-[#f59e0b] border-2 border-black text-black flex items-center justify-center font-bold text-xs shadow-pixel-sm">
          <Crown className="w-3.5 h-3.5 fill-black" />
        </div>
      );
    }
    if (index === 1) {
      return (
        <div className="w-6 h-6 bg-slate-300 border-2 border-black text-black flex items-center justify-center font-bold text-xs shadow-pixel-sm">
          <Medal className="w-3.5 h-3.5" />
        </div>
      );
    }
    if (index === 2) {
      return (
        <div className="w-6 h-6 bg-[#b45309] border-2 border-black text-white flex items-center justify-center font-bold text-xs shadow-pixel-sm">
          <Medal className="w-3.5 h-3.5" />
        </div>
      );
    }
    return (
      <div className="w-6 h-6 bg-[#181a24] border border-[#282c3c] text-slate-400 flex items-center justify-center font-arcade text-sm font-bold">
        #{index + 1}
      </div>
    );
  };

  return (
    <div className="arcade-box p-3.5 bg-[#12141c] border-2 border-black flex flex-col gap-3 shadow-pixel">
      <div className="flex items-center justify-between border-b border-[#282c3c] pb-2">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-[#f59e0b]" />
          <h3 className="font-pixel text-xs text-white uppercase">HALL OF FAME (TOP 50)</h3>
        </div>
        <button
          onClick={() => {
            sound.playClick();
            fetchLeaders();
          }}
          disabled={loading}
          className="text-slate-400 hover:text-white p-1 hover:bg-[#282c3c] transition border border-transparent hover:border-black"
          title="Refresh Leaderboard"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex flex-col gap-1.5 max-h-80 overflow-y-auto pr-1">
        {loading && leaders.length === 0 ? (
          <div className="p-6 text-center text-slate-400 font-arcade text-sm flex flex-col items-center gap-2">
            <div className="w-5 h-5 border-2 border-[#f59e0b] border-t-transparent rounded-full animate-spin" />
            <span>LOADING HALL OF FAME...</span>
          </div>
        ) : leaders.length === 0 ? (
          <div className="p-6 text-center text-slate-400 font-arcade text-sm flex flex-col items-center gap-1.5">
            <Trophy className="w-8 h-8 text-slate-600 stroke-1" />
            <p className="text-slate-300">NO WARRIORS RANKED YET.</p>
            <p className="text-xs text-slate-500">BE THE FIRST TO PAINT ON THE CANVAS AND CLAIM #1!</p>
          </div>
        ) : (
          leaders.map((u, i) => (
            <div
              key={u.id}
              className={`flex items-center justify-between p-2 border-2 transition ${
                i === 0
                  ? "bg-[#1f1912] border-[#f59e0b]"
                  : i === 1
                  ? "bg-[#161822] border-slate-500"
                  : i === 2
                  ? "bg-[#1c1410] border-[#b45309]"
                  : "bg-[#181a24] border-[#282c3c]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                {getRankBadge(i)}
                <div>
                  <span className="font-pixel text-[9px] text-white block truncate max-w-[130px] sm:max-w-[200px]">
                    {u.username ? `@${u.username}` : (u.first_name || `Warrior ${u.id.slice(0, 5)}`)}
                  </span>
                  <span className="font-arcade text-xs text-slate-400">
                    {u.total_pixels_placed || 0} PX ({u.recolored_pixels_placed || 0} RECOLORS)
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="font-arcade text-base font-bold text-[#fbbf24] block">
                  {(u.airdrop_points || 0).toFixed(1)} PTS
                </span>
                {(u.referral_points || 0) > 0 && (
                  <span className="font-pixel text-[7px] text-[#a78bfa] block">
                    +{(u.referral_points || 0).toFixed(1)} REF
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}