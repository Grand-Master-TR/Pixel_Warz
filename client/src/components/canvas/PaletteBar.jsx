import React from "react";
import { useGame } from "../../context/GameContext.jsx";
import { useTelegram } from "../../context/TelegramContext.jsx";
import { sound } from "../../services/sound.js";
import { PALETTE } from "../../utils/palette.js";
import { Paintbrush, Eye, Pipette, Bomb } from "lucide-react";

export function PaletteBar({ onOpenStore }) {
  const {
    selectedColor,
    setSelectedColor,
    activeTool,
    setActiveTool,
    player,
  } = useGame();
  const { haptic } = useTelegram();

  const handleColorSelect = (idx) => {
    setSelectedColor(idx);
    if (activeTool !== "brush" && activeTool !== "bomb") {
      setActiveTool("brush");
    }
    sound.playClick();
    haptic.selection();
  };

  const handleBombSelect = () => {
    sound.playClick();
    haptic.impact("medium");
    setActiveTool("bomb");
  };

  const bombCount = player?.bombBalance || 0;

  return (
    <div className="flex flex-col gap-2 w-full max-w-lg mx-auto px-2">
      {/* Tool Selector Bar */}
      <div className="flex items-center justify-center gap-1.5 self-center bg-[#12141c] p-1 border-2 border-black shadow-pixel-sm">
        {/* Draw Brush */}
        <button
          onClick={() => {
            setActiveTool("brush");
            sound.playClick();
            haptic.impact("light");
          }}
          className={`flex items-center gap-1 px-2.5 py-1 font-pixel text-[9px] uppercase transition-all ${
            activeTool === "brush"
              ? "pixel-btn pixel-btn-emerald text-black shadow-pixel-sm"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Paintbrush className="w-3 h-3" />
          <span>Draw</span>
        </button>

        {/* 3x3 Paint Bomb Tool */}
        <button
          onClick={handleBombSelect}
          className={`flex items-center gap-1 px-2.5 py-1 font-pixel text-[9px] uppercase transition-all ${
            activeTool === "bomb"
              ? "pixel-btn pixel-btn-crimson text-white shadow-pixel-sm animate-pulse"
              : "text-[#ef4444] hover:text-[#f87171]"
          }`}
          title="Paint 3x3 (9-pixel area blast)"
        >
          <Bomb className="w-3 h-3" />
          <span>Bomb ({bombCount})</span>
        </button>

        {/* Inspect Owner */}
        <button
          onClick={() => {
            setActiveTool("inspect");
            sound.playClick();
            haptic.impact("light");
          }}
          className={`flex items-center gap-1 px-2.5 py-1 font-pixel text-[9px] uppercase transition-all ${
            activeTool === "inspect"
              ? "pixel-btn pixel-btn-gold text-black shadow-pixel-sm"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Eye className="w-3 h-3" />
          <span>Inspect</span>
        </button>

        {/* Eyedrop Color Picker */}
        <button
          onClick={() => {
            setActiveTool("pipette");
            sound.playClick();
            haptic.impact("light");
          }}
          className={`flex items-center gap-1 px-2.5 py-1 font-pixel text-[9px] uppercase transition-all ${
            activeTool === "pipette"
              ? "pixel-btn pixel-btn-violet text-white shadow-pixel-sm"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Pipette className="w-3 h-3" />
          <span>Eyedrop</span>
        </button>
      </div>

      {/* 32-Color Palette Swatches */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 px-2 no-scrollbar scroll-smooth bg-[#12141c]/90 p-2 border-2 border-black shadow-pixel-sm">
        {PALETTE.map((c) => {
          const isSelected = selectedColor === c.id;
          return (
            <button
              key={c.id}
              onClick={() => handleColorSelect(c.id)}
              className={`relative flex-shrink-0 w-7 h-7 border-2 transition-all transform ${
                isSelected
                  ? "border-white scale-110 shadow-pixel-sm z-10 ring-2 ring-[#f59e0b]"
                  : "border-black hover:scale-105 opacity-90"
              }`}
              style={{ backgroundColor: c.hex }}
              title={`${c.name} (#${c.id})`}
            >
              {isSelected && (
                <div className="absolute inset-0 m-auto w-1.5 h-1.5 bg-black" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}