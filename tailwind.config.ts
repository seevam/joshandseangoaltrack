import type { Config } from 'tailwindcss';

/*
 * A colour token that also works with an opacity modifier.
 *
 * The tokens are CSS variables so the app can be re-themed, and Tailwind
 * cannot apply "/40" to a bare var(): every border-brand/40, bg-brand/10 and
 * the like was silently dropped from the build, so those borders and tints
 * never rendered anywhere. With a modifier the colour is mixed with
 * transparent instead; without one it stays the plain variable, so browsers
 * too old for color-mix() still get every solid colour.
 */
const token = (name: string) =>
  // Tailwind 3 accepts a function colour at runtime; its types only list strings.
  (({ opacityValue }: { opacityValue?: string }) =>
    opacityValue === undefined || opacityValue.startsWith('var(')
      ? `var(${name})`
      : `color-mix(in srgb, var(${name}) calc(${opacityValue} * 100%), transparent)`) as unknown as string;

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
        bg: token('--bg'),
        card: token('--card'),
        elevated: token('--elevated'),
        line: token('--line'),
        track: token('--track'),
        'line-strong': token('--line-strong'),
        fg: token('--fg'),
        muted: token('--muted'),
        brand: token('--brand'),
        'brand-dark': token('--brand-dark'),
        'brand-light': token('--brand-light'),
      },
    },
  },
  plugins: [],
};

export default config;
