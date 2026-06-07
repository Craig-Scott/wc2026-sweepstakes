/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Barlow Condensed', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Primary action / accent — pitch green
        brand: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        // Stripe-ish deep navy — header & primary text
        navy: {
          500: '#2d4a6e',
          700: '#0d2d4f',
          900: '#0a2540',
        },
        gold: {
          400: '#fbbf24',
          500: '#f59e0b',
        },
        // Keep a muted red for danger/errors only
        danger: {
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
        },
      },
    },
  },
  plugins: [],
}
