import React from "react";
import { useGame } from "../../context/GameContext.jsx";
import { X, User, Repeat, Clock, MapPin } from "lucide-react";

export function PixelInspector() {
  const { inspectedPixel, isInspectorOpen, setIsInspectorOpen } = useGame();

  if (!isInspectorOpen || !inspectedPixel) return null;

  const formatDate = (ts) => {
    if (!ts) return "Never";
    const date = new Date(ts * 1000);
    return date.toLocaleString();
  };

  return (
    <div className="absolute top-16 left-4 right-4 max-w-sm mx-auto arcade-box p-3.5 bg-[#12141c] border-2 border-black z-30 shadow-pixel animate-bounce-short">
      <div className="flex items-center justify-between pb-2 border-b-2 border-[#282c3c]">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-[#f59e0b]" />
          <span className="font-pixel text-[10px] text-white uppercase tracking-wider">
            COORDS ({inspectedPixel.x}, {inspectedPixel.y})
          </span>
        </div>
        <button
          onClick={() => setIsInspectorOpen(false)}
          className="text-slate-400 hover:text-white p-1 hover:bg-[#282c3c] transition border border-transparent hover:border-black"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-2.5 text-xs">
        {/* Color preview */}
        <div className="flex items-center gap-2 bg-[#181a24] p-2 border border-[#282c3c]">
          <div
            className="w-6 h-6 border-2 border-black shadow-pixel-sm flex-shrink-0"
            style={{ backgroundColor: inspectedPixel.colorHex }}
          />
          <div>
            <span className="font-pixel text-[8px] text-slate-400 block">COLOR</span>
            <span className="font-arcade text-xs text-[#fbbf24] font-bold">{inspectedPixel.colorHex}</span>
          </div>
        </div>

        {/* Recolor Count */}
        <div className="flex items-center gap-2 bg-[#181a24] p-2 border border-[#282c3c]">
          <Repeat className="w-4 h-4 text-[#ef4444]" />
          <div>
            <span className="font-pixel text-[8px] text-slate-400 block">OVERWRITTEN</span>
            <span className="font-arcade text-xs text-[#f87171] font-bold">{inspectedPixel.recolorCount} TIMES</span>
          </div>
        </div>

        {/* Owner / Last placed by */}
        <div className="col-span-2 flex items-center gap-2 bg-[#181a24] p-2 border border-[#282c3c]">
          <User className="w-4 h-4 text-[#10b981]" />
          <div>
            <span className="font-pixel text-[8px] text-slate-400 block">LAST CONQUEROR</span>
            <span className="font-bold text-slate-200 text-xs font-arcade tracking-wider">
              {inspectedPixel.username || "UNCLAIMED (WHITE)"}
            </span>
          </div>
        </div>

        {/* Timestamp */}
        {inspectedPixel.lastPlacedAt && (
          <div className="col-span-2 flex items-center gap-2 bg-[#181a24] p-2 border border-[#282c3c]">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <div>
              <span className="font-pixel text-[8px] text-slate-400 block">TIMESTAMP</span>
              <span className="text-slate-300 font-arcade text-xs">{formatDate(inspectedPixel.lastPlacedAt)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}