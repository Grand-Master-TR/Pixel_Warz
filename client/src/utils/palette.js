export const PALETTE = [
  { id: 0, hex: "#FFFFFF", name: "White", category: "mono" },
  { id: 1, hex: "#E4E4E4", name: "Light Gray", category: "mono" },
  { id: 2, hex: "#888888", name: "Gray", category: "mono" },
  { id: 3, hex: "#222222", name: "Dark Gray", category: "mono" },
  { id: 4, hex: "#000000", name: "Black", category: "mono" },
  { id: 5, hex: "#FFA7D1", name: "Pink", category: "warm" },
  { id: 6, hex: "#E50000", name: "Red", category: "warm" },
  { id: 7, hex: "#E59500", name: "Orange", category: "warm" },
  { id: 8, hex: "#A06A42", name: "Brown", category: "warm" },
  { id: 9, hex: "#E5D900", name: "Yellow", category: "warm" },
  { id: 10, hex: "#94E044", name: "Lime", category: "cool" },
  { id: 11, hex: "#02BE01", name: "Green", category: "cool" },
  { id: 12, hex: "#00D3DD", name: "Cyan", category: "cool" },
  { id: 13, hex: "#0083C7", name: "Teal Blue", category: "cool" },
  { id: 14, hex: "#0000EA", name: "Blue", category: "cool" },
  { id: 15, hex: "#CF6EE4", name: "Magenta", category: "vibrant" },
  { id: 16, hex: "#820080", name: "Purple", category: "vibrant" },
  { id: 17, hex: "#FF4500", name: "Neon Red", category: "vibrant" },
  { id: 18, hex: "#FFA800", name: "Neon Orange", category: "vibrant" },
  { id: 19, hex: "#FFD635", name: "Gold Yellow", category: "vibrant" },
  { id: 20, hex: "#00A368", name: "Emerald", category: "vibrant" },
  { id: 21, hex: "#7EED56", name: "Neon Green", category: "vibrant" },
  { id: 22, hex: "#2450A4", name: "Navy Blue", category: "cool" },
  { id: 23, hex: "#3690EA", name: "Sky Blue", category: "cool" },
  { id: 24, hex: "#51E9F4", name: "Electric Cyan", category: "cool" },
  { id: 25, hex: "#811E9F", name: "Violet", category: "dark" },
  { id: 26, hex: "#B44AC0", name: "Orchid", category: "dark" },
  { id: 27, hex: "#FF99AA", name: "Rose", category: "warm" },
  { id: 28, hex: "#9C6926", name: "Dark Bronze", category: "dark" },
  { id: 29, hex: "#6D001A", name: "Crimson", category: "dark" },
  { id: 30, hex: "#00392B", name: "Deep Forest", category: "dark" },
  { id: 31, hex: "#493AC1", name: "Indigo Night", category: "dark" },
];

export function hexToRgb(hex) {
  const bigint = parseInt(hex.replace("#", ""), 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

export function isColorLight(hex) {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
}

// Pre-create RGB Uint8ClampedArray for instant canvas direct pixel rendering
export const PALETTE_RGB = PALETTE.map((c) => {
  const { r, g, b } = hexToRgb(c.hex);
  return [r, g, b];
});
