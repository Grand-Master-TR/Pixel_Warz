import React, { useRef, useEffect, useState, useCallback } from "react";
import { useGame } from "../../context/GameContext.jsx";
import { PALETTE, PALETTE_RGB } from "../../utils/palette.js";
import { ZoomIn, ZoomOut, Maximize2, Compass, Bomb } from "lucide-react";

export function PixelCanvas() {
  const {
    canvasBufferRef,
    canvasReady,
    canvasVersion,
    activeTool,
    selectedColor,
    stagePixel,
    unstagePixel,
    pendingPixels,
    inspectCoordinates,
    pickColorFromCanvas,
  } = useGame();

  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const offscreenCanvasRef = useRef(null);

  // Camera Viewport State: pan (offset x, y) & zoom
  const [viewport, setViewport] = useState({
    x: 0,
    y: 0,
    zoom: 1,
  });

  const [hoverCoords, setHoverCoords] = useState({ x: 500, y: 500 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, vX: 0, vY: 0, moved: false });
  const touchDistanceRef = useRef(null);

  // Initialize Offscreen 1000x1000 Canvas
  useEffect(() => {
    const offscreen = document.createElement("canvas");
    offscreen.width = 1000;
    offscreen.height = 1000;
    offscreenCanvasRef.current = offscreen;

    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      const initialZoom = Math.min(clientWidth / 1000, clientHeight / 1000) * 0.9;
      setViewport({
        x: (clientWidth - 1000 * initialZoom) / 2,
        y: (clientHeight - 1000 * initialZoom) / 2,
        zoom: Math.max(0.3, initialZoom),
      });
    }
  }, []);

  // Update Offscreen Canvas buffer when canvasVersion changes
  const updateOffscreen = useCallback(() => {
    const offscreen = offscreenCanvasRef.current;
    if (!offscreen || !canvasReady) return;

    const ctx = offscreen.getContext("2d");
    const imgData = ctx.createImageData(1000, 1000);
    const data = imgData.data;
    const buffer = canvasBufferRef.current;

    for (let i = 0; i < 1000000; i++) {
      const colorIdx = buffer[i];
      const rgb = PALETTE_RGB[colorIdx] || [255, 255, 255];
      const p = i * 4;
      data[p] = rgb[0];
      data[p + 1] = rgb[1];
      data[p + 2] = rgb[2];
      data[p + 3] = 255;
    }

    ctx.putImageData(imgData, 0, 0);
  }, [canvasReady, canvasVersion, canvasBufferRef]);

  useEffect(() => {
    updateOffscreen();
  }, [updateOffscreen]);

  // Main Render Loop onto display canvas
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const offscreen = offscreenCanvasRef.current;
    if (!canvas || !offscreen) return;

    const ctx = canvas.getContext("2d");
    const { width, height } = canvas;

    // Clear background with dark obsidian tone
    ctx.fillStyle = "#0a0b0e";
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    // Apply camera transform
    ctx.translate(viewport.x, viewport.y);
    ctx.scale(viewport.zoom, viewport.zoom);

    // Draw offscreen 1000x1000 canvas
    ctx.drawImage(offscreen, 0, 0);

    // Draw Pending (Staged) Pixels
    if (pendingPixels.size > 0) {
      for (const p of pendingPixels.values()) {
        const hex = PALETTE[p.colorIndex]?.hex || "#FF0000";
        ctx.fillStyle = hex;
        ctx.fillRect(p.x, p.y, 1, 1);

        // Highlight ring: Crimson for bomb/recolor, Emerald for fresh
        ctx.strokeStyle = activeTool === "bomb" ? "#ef4444" : p.isRecolor ? "#f59e0b" : "#10b981";
        ctx.lineWidth = 1.2 / viewport.zoom;
        ctx.strokeRect(p.x, p.y, 1, 1);
      }
    }

    // Draw 3x3 Bomb Target Crosshair if Bomb tool is active
    if (activeTool === "bomb" && hoverCoords) {
      const bx = Math.max(0, hoverCoords.x - 1);
      const by = Math.max(0, hoverCoords.y - 1);
      ctx.fillStyle = "rgba(239, 68, 68, 0.25)";
      ctx.fillRect(bx, by, 3, 3);
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 1.5 / viewport.zoom;
      ctx.strokeRect(bx, by, 3, 3);
    }

    // Draw Pixel Grid when zoomed in close (zoom >= 8)
    if (viewport.zoom >= 8) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 0.5 / viewport.zoom;

      const startX = Math.max(0, Math.floor(-viewport.x / viewport.zoom));
      const endX = Math.min(1000, Math.ceil((width - viewport.x) / viewport.zoom));
      const startY = Math.max(0, Math.floor(-viewport.y / viewport.zoom));
      const endY = Math.min(1000, Math.ceil((height - viewport.y) / viewport.zoom));

      ctx.beginPath();
      for (let x = startX; x <= endX; x++) {
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
      }
      for (let y = startY; y <= endY; y++) {
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
      }
      ctx.stroke();
    }

    // Outer border of 1000x1000 canvas in retro amber
    ctx.strokeStyle = "rgba(245, 158, 11, 0.5)";
    ctx.lineWidth = 2 / viewport.zoom;
    ctx.strokeRect(0, 0, 1000, 1000);

    ctx.restore();
  }, [viewport, pendingPixels, canvasVersion, activeTool, hoverCoords]);

  // Resize canvas to match container
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        canvasRef.current.width = rect.width;
        canvasRef.current.height = rect.height;
        render();
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [render]);

  useEffect(() => {
    render();
  }, [render, viewport, pendingPixels, canvasVersion, activeTool, hoverCoords]);

  // Convert Screen Coordinates (px) to Canvas Pixel Coordinates (0-999)
  const screenToCanvasCoords = (clientX, clientY) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;

    const canvasX = Math.floor((screenX - viewport.x) / viewport.zoom);
    const canvasY = Math.floor((screenY - viewport.y) / viewport.zoom);

    return {
      x: Math.max(0, Math.min(999, canvasX)),
      y: Math.max(0, Math.min(999, canvasY)),
      inBounds: canvasX >= 0 && canvasX < 1000 && canvasY >= 0 && canvasY < 1000,
    };
  };

  const zoomAtPoint = (factor, centerX, centerY) => {
    setViewport((prev) => {
      const newZoom = Math.max(0.15, Math.min(45, prev.zoom * factor));
      const scaleChange = newZoom / prev.zoom;

      const newX = centerX - (centerX - prev.x) * scaleChange;
      const newY = centerY - (centerY - prev.y) * scaleChange;

      return { x: newX, y: newY, zoom: newZoom };
    });
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.2 : 0.833;
    const rect = canvasRef.current.getBoundingClientRect();
    zoomAtPoint(factor, e.clientX - rect.left, e.clientY - rect.top);
  };

  const handlePointerDown = (e) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      vX: viewport.x,
      vY: viewport.y,
      moved: false,
    };
  };

  const handlePointerMove = (e) => {
    const coords = screenToCanvasCoords(e.clientX, e.clientY);
    if (coords.inBounds) {
      setHoverCoords(coords);
    }

    if (!isDragging) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      dragStartRef.current.moved = true;
    }

    setViewport((prev) => ({
      ...prev,
      x: dragStartRef.current.vX + dx,
      y: dragStartRef.current.vY + dy,
    }));
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);

    if (!dragStartRef.current.moved) {
      const coords = screenToCanvasCoords(e.clientX, e.clientY);
      if (coords.inBounds) {
        if (activeTool === "brush") {
          const key = `${coords.x}_${coords.y}`;
          if (pendingPixels.has(key) && pendingPixels.get(key).colorIndex === selectedColor) {
            unstagePixel(coords.x, coords.y);
          } else {
            stagePixel(coords.x, coords.y, selectedColor);
          }
        } else if (activeTool === "bomb") {
          // 💣 Stage 3x3 Bomb (9 pixels centered on clicked coordinate)
          stagePixel(coords.x, coords.y, selectedColor);
        } else if (activeTool === "inspect") {
          inspectCoordinates(coords.x, coords.y);
        } else if (activeTool === "pipette") {
          pickColorFromCanvas(coords.x, coords.y);
        }
      }
    }
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchDistanceRef.current = dist;
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && touchDistanceRef.current) {
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / touchDistanceRef.current;
      touchDistanceRef.current = dist;

      const rect = canvasRef.current.getBoundingClientRect();
      const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
      const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;

      zoomAtPoint(factor, centerX, centerY);
    }
  };

  const resetView = () => {
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      const fitZoom = Math.min(clientWidth / 1000, clientHeight / 1000) * 0.95;
      setViewport({
        x: (clientWidth - 1000 * fitZoom) / 2,
        y: (clientHeight - 1000 * fitZoom) / 2,
        zoom: fitZoom,
      });
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-[#0a0b0e] flex items-center justify-center select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      <canvas
        ref={canvasRef}
        className="pixel-canvas w-full h-full cursor-crosshair block"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />

      {/* Floating Retro HUD: Coordinates & Zoom Level */}
      <div className="absolute top-3 left-3 flex items-center gap-2 bg-[#12141c]/90 border-2 border-black px-2.5 py-1 text-xs font-arcade text-slate-300 z-10 shadow-pixel pointer-events-none">
        {activeTool === "bomb" ? (
          <Bomb className="w-3.5 h-3.5 text-[#ef4444] animate-bounce" />
        ) : (
          <Compass className="w-3.5 h-3.5 text-[#f59e0b]" />
        )}
        <span className="font-pixel text-[9px]">
          X:<strong className="text-[#fbbf24] ml-0.5">{hoverCoords.x}</strong> Y:<strong className="text-[#fbbf24] ml-0.5">{hoverCoords.y}</strong>
        </span>
        <span className="text-slate-600">|</span>
        <span className="font-arcade text-[#10b981] font-bold text-sm tracking-wider">{viewport.zoom.toFixed(1)}X</span>
        {activeTool === "bomb" && (
          <span className="font-pixel text-[8px] bg-[#2e1515] text-[#f87171] px-1.5 py-0.2 border border-[#991b1b]">
            3x3 BLAST
          </span>
        )}
      </div>

      {/* Floating Retro Zoom Controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10">
        <button
          onClick={() => zoomAtPoint(1.4, canvasRef.current.width / 2, canvasRef.current.height / 2)}
          className="p-2 bg-[#12141c] border-2 border-black text-slate-200 hover:text-[#f59e0b] shadow-pixel active:translate-y-0.5 transition"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => zoomAtPoint(0.7, canvasRef.current.width / 2, canvasRef.current.height / 2)}
          className="p-2 bg-[#12141c] border-2 border-black text-slate-200 hover:text-[#f59e0b] shadow-pixel active:translate-y-0.5 transition"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={resetView}
          className="p-2 bg-[#12141c] border-2 border-black text-slate-200 hover:text-[#f59e0b] shadow-pixel active:translate-y-0.5 transition"
          title="Fit Canvas"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}