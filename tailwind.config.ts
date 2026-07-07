import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: '#5DBC70',
        'brand-dark': '#4EAA5F',
        'brand-light': '#D0EDDA',
        surface: '#F0F0F0',
      },
    },
  },
  plugins: [],
};

export default config;
