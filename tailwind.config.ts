import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        ink: "#07111F",
        mist: "#EBF4FF",
        cyan: "#2AD4FF",
        coral: "#FF7F6F",
        sand: "#FFD9A0"
      },
      boxShadow: {
        glass: "0 24px 80px rgba(7, 17, 31, 0.18)"
      },
      backgroundImage: {
        aura: "radial-gradient(circle at top, rgba(42, 212, 255, 0.26), transparent 35%), radial-gradient(circle at bottom right, rgba(255, 127, 111, 0.2), transparent 30%), linear-gradient(135deg, #07111F 0%, #0F1D33 48%, #13284B 100%)"
      }
    }
  },
  plugins: []
};

export default config;
