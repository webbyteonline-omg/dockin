import type { Config } from "tailwindcss";

// Reads a CSS custom property that stores an "R G B" triple and applies
// Tailwind's alpha-value suffix support (e.g. bg-card/50).
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

// Bakes a fixed alpha into a color token via CSS color-mix(), so classes
// like `text-ink-dim` render pre-dimmed everywhere without requiring a
// per-usage `/50` opacity modifier at every call site.
const dim = (name: string, alpha: number) =>
  `color-mix(in srgb, rgb(var(--${name})) ${alpha * 100}%, transparent)`;

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: v("bg"),
        card: v("card"),
        "card-hover": v("card-hover"),
        line: v("line"),
        input: v("input"),

        primary: { DEFAULT: "#FF6B35", dim: "#FF6B3526" },
        secondary: { DEFAULT: "#FF2D78", dim: "#FF2D7826" },
        accent: { DEFAULT: "#FFD166", dim: "#FFD16626" },
        success: { DEFAULT: "#2FE0A3", dim: "#2FE0A326" },
        warning: { DEFAULT: "#FFB347", dim: "#FFB34726" },
        danger: { DEFAULT: "#FF5C5C", dim: "#FF5C5C26" },

        ink: {
          DEFAULT: v("ink"),
          dim: dim("ink-dim", 0.55),
          faint: dim("ink-faint", 0.35),
        },
      },
      borderRadius: {
        card: "22px",
        hero: "24px",
        btn: "14px",
        input: "16px",
        pill: "100px",
      },
      backgroundImage: {
        "dockin-gradient": "linear-gradient(135deg, #FF6B35, #FF2D78)",
        "dockin-gradient-h": "linear-gradient(90deg, #FF6B35, #FF2D78)",
        "dockin-gradient-soft": "linear-gradient(135deg, #FF2D78, #FF7A3D)",
        "dockin-dark": "linear-gradient(120deg, #14121C 55%, #3a1440 100%)",
        "dockin-dark-diag": "linear-gradient(135deg, #14121C 50%, #3a1440 100%)",
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
        display: ["var(--font-unbounded)", "var(--font-jakarta)", "sans-serif"],
        hand: ["var(--font-caveat)", "cursive"],
      },
    },
  },
  plugins: [],
};

export default config;
