import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          DEFAULT: "#e31b23",
          hover: "#ff2f38",
          soft: "#fde047",
          surface: "rgba(227, 27, 35, 0.14)",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
