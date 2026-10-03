import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        paper: "#f7f5ef",
        moss: "#596f62",
        coral: "#c25b4b",
        steel: "#455a64"
      },
      boxShadow: {
        soft: "0 18px 45px rgba(17, 24, 39, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;
