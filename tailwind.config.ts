import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: [
          "\"Songti SC\"",
          "\"Noto Serif CJK SC\"",
          "\"STSong\"",
          "serif",
        ],
        "cover-tap": [
          "\"Kaiti SC\"",
          "\"STKaiti\"",
          "\"Songti SC\"",
          "serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
