import React, { useRef, useEffect, useState } from "react";
import { useGame } from "../../context/GameContext.jsx";
import { PALETTE_RGB } from "../../utils/palette.js";
import { Map, X } from "lucide-react";

export function MiniMap() {
  const { canvasBufferRef, canvasVersion } = useGame();
  const canvasRef = useRef(null);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const imgData = ctx.createImageData(100, 100);
    const data = imgData.data;
    const buffer = canvasBufferRef.current;

    for (let y = 0; y < 100; y++) {
      for (let x = 0; x < 100; x++) {
        const fullIndex = (y * 10) * 1000 + (x * 10);
        const colorIdx = buffer[fullIndex];
        const rgb = PALETTE_RGB[colorIdx] || [255, 255, 255];
        const p = (y * 100 + x) * 4;
        data[p] = rgb[0];
        data[p + 1] = rgb[1];
        data[p + 2] = rgb[2];
        data[p + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }, [canvasVersion, isOpen, canvasBufferRef]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="absolute bottom-24 right-3 bg-[#12141c] border-2 border-black p-2 text-slate-300 hover:text-white shadow-pixel z-10"
        title="Open MiniMap"
      >
        <Map className="w-4 h-4 text-[#f59e0b]" />
      </button>
    );
  }

  return (
    <div className="absolute bottom-24 right-3 arcade-box p-1.5 bg-[#12141c] border-2 border-black shadow-pixel z-10 flex flex-col gap-1">
      <div className="flex items-center justify-between px-1">
        <span className="font-pixel text-[8px] text-[#f59e0b] tracking-wider uppercase">RADAR 1M</span>
        <button
          onClick={() => setIsOpen(false)}
          className="text-slate-400 hover:text-white"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={100}
        height={100}
        className="w-20 h-20 bg-black border border-[#282c3c] block pixel-canvas"
      />
    </div>
  );
}