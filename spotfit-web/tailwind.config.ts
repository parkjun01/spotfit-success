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
        primary: '#c9f236',
        'primary-on': '#171e00',
        'bg-dark': '#131314',
        'surface': '#141416',
        'elevated': '#1E1E22',
        'surface-high': '#2a2a2b',
        'surface-highest': '#353436',
        'border-dark': '#2A2A32',
        'text-primary': '#F0F0F2',
        'text-secondary': '#8A8A9A',
        'text-disabled': '#3E3E4A',
        'on-bg': '#e5e2e3',
        'on-surface-variant': '#c5c9ae',
        success: '#22C55E',
        danger: '#EF4444',
        orange: '#fd591e',
      },
      fontFamily: {
        display: ['Bebas Neue', 'sans-serif'],
        headline: ['Barlow Condensed', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
