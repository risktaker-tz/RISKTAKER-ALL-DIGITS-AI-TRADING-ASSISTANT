import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#050816",
        panel: "#0d142c",
        pulse: "#00f5d4",
        flare: "#35a7ff",
        ember: "#ff6b6b",
        gold: "#ffd166"
      },
      boxShadow: {
        neon: "0 0 0 1px rgba(53,167,255,0.18), 0 18px 60px rgba(0, 245, 212, 0.12)"
      },
      backgroundImage: {
        grid: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)"
      }
    }
  },
  plugins: []
};

export default config;
