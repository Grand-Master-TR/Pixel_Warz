import React, { useEffect, useState } from "react";
import { api } from "../../services/api.js";
import { Activity, Flame, Repeat, Clock, RefreshCw } from "lucide-react";

export function ActivityFeed() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadFeed = async () => {
    setLoading(true);
    try {
      const data = await api.getRecentActivity();
      setActivities(data.recent || []);
    } catch (e) {
      console.warn("Feed error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeed();
    const timer = setInterval(loadFeed, 6000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (ts) => {
    if (!ts) return "";
    const secs = Math.floor(Date.now() / 1000) - ts;
    if (secs < 60) return `${secs}S AGO`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}M AGO`;
    return `${Math.floor(mins / 60)}H AGO`;
  };

  return (
    <div className="arcade-box p-3.5 bg-[#12141c] border-2 border-black flex flex-col gap-3 shadow-pixel">
      <div className="flex items-center justify-between border-b border-[#282c3c] pb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#10b981]" />
          <h3 className="font-pixel text-xs text-white uppercase">LIVE CONQUEST BATTLE FEED</h3>
        </div>
        <button
          onClick={loadFeed}
          disabled={loading}
          className="text-slate-400 hover:text-white p-1 hover:bg-[#282c3c] transition border border-transparent hover:border-black"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex flex-col gap-1.5 max-h-80 overflow-y-auto pr-1">
        {activities.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-2 bg-[#181a24] border border-[#282c3c] text-xs"
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-4 h-4 border-2 border-black shadow-pixel-sm flex-shrink-0"
                style={{ backgroundColor: item.colorHex }}
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-pixel text-[9px] text-white">{item.user}</span>
                  <span className="font-arcade text-xs text-slate-400">AT ({item.x}, {item.y})</span>
                </div>
                <div className="flex items-center gap-2 font-arcade text-xs">
                  {item.isRecolor ? (
                    <span className="text-[#f87171] font-bold flex items-center gap-0.5">
                      <Repeat className="w-3 h-3" />
                      <span>OVERWROTE (+1.5 PTS)</span>
                    </span>
                  ) : (
                    <span className="text-[#34d399] flex items-center gap-0.5">
                      <Flame className="w-3 h-3" />
                      <span>FRESH (+1.0 PT)</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <span className="font-arcade text-xs text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{formatTime(item.time)}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}