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
        // Semantic tokens — all resolve to the CSS vars in globals.css so the
        // whole app can be re-themed from one place.
        bg: 'var(--bg)',
        card: 'var(--card)',
        elevated: 'var(--elevated)',
        line: 'var(--line)',
        track: 'var(--track)',
        'line-strong': 'var(--line-strong)',
        fg: 'var(--fg)',
        muted: 'var(--muted)',
        brand: 'var(--brand)',
        'brand-dark': 'var(--brand-dark)',
        'brand-light': 'var(--brand-light)',
      },
    },
  },
  plugins: [],
};

export default config;
