import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: "#c9a96e",
          dim: "#8a6e42",
          light: "#d8be8d",
          deep: "#9c7a3e",
        },
        obsidian: {
          bg: "#0f0e0d",
          surface: "#1a1916",
          surface2: "#242220",
          line: "#2e2c29",
          text: "#f0ece6",
          muted: "#a39c8f",
          faint: "#6f685c",
        },
        warm: {
          bg: "#faf8f5",
          surface: "#ffffff",
          surface2: "#f2eee7",
          line: "#e6e0d5",
          text: "#1c1a17",
          muted: "#726b5f",
          faint: "#a29a8c",
        },
        pick: {
          DEFAULT: "#4caf7d",
          dark: "#2f8659",
        },
      },
      fontFamily: {
        serif: ["var(--font-cormorant)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;

