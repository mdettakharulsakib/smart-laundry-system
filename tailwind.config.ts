import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // "Fresh wash" palette — deep water teal + soap-suds off-white + citrus accent
        ink: "#12232B",
        teal: {
          50: "#EAF4F3",
          100: "#CFE6E3",
          200: "#9FCDC6",
          300: "#6FB4AA",
          400: "#3E9A8D",
          500: "#1F7A6E",
          600: "#155F56",
          700: "#0F4741",
          800: "#0A302C",
          900: "#061A18",
        },
        suds: "#F6F5F0",
        citrus: {
          400: "#FFB25E",
          500: "#FF9838",
          600: "#F07E14",
        },
        line: "#E2E0D8",
        // Figma prototype palette — purple header + photo-background overlay
        header: "#7D6D93",
        headerDark: "#5F5273",
        overlay: {
          DEFAULT: "rgba(139, 20, 30, 0.35)", // red/pink photo-tint from the prototype
          card: "rgba(24, 20, 28, 0.62)", // dark glass card over the photo
        },
        loginBtn: "#4A9FE0",
        signupBtn: "#2E2EE0",
      },
      fontFamily: {
        display: ["var(--font-sora)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
        script: ["var(--font-script)", "cursive"],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      boxShadow: {
        soft: "0 8px 30px -12px rgba(18,35,43,0.18)",
      },
    },
  },
  plugins: [],
};
export default config;
