/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Silkscreen"', "monospace"],
        arcade: ['"VT323"', "monospace"],
        sans: ['"Space Grotesk"', "sans-serif"],
      },
      colors: {
        arcade: {
          bg: "#0a0b0e",
          card: "#12141c",
          surface: "#1a1d28",
          border: "#282c3c",
          subtle: "#3b4055",
        },
        retro: {
          gold: "#f59e0b",
          goldLight: "#fbbf24",
          goldDark: "#b45309",
          emerald: "#10b981",
          emeraldLight: "#34d399",
          emeraldDark: "#047857",
          crimson: "#ef4444",
          crimsonLight: "#f87171",
          crimsonDark: "#b91c1c",
          violet: "#8b5cf6",
          violetLight: "#a78bfa",
          violetDark: "#6d28d9",
          amber: "#f97316",
        }
      },
      boxShadow: {
        'pixel': '3px 3px 0px #000',
        'pixel-sm': '2px 2px 0px #000',
        'pixel-lg': '4px 4px 0px #000',
        'pixel-gold': '0 4px 0 #b45309',
        'pixel-emerald': '0 4px 0 #047857',
        'pixel-crimson': '0 4px 0 #b91c1c',
        'pixel-violet': '0 4px 0 #6d28d9',
        'pixel-dark': '0 4px 0 #000000',
      }
    },
  },
  plugins: [],
}