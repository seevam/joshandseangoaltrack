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
        brand: '#58CC02',
        'brand-dark': '#4CAD02',
        'brand-light': '#D7FFB8',
        surface: '#F0F0F0',
      },
    },
  },
  plugins: [],
};

export default config;
