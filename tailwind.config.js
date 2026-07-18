/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./web/templates/**/*.html', './web/static/**/*.js'],
  safelist: [
    // Rank badge classes (dynamically generated via JS)
    'rank-ss',
    'rank-ssh',
    'rank-s',
    'rank-sh',
    'rank-a',
    'rank-b',
    'rank-c',
    'rank-d',
    'rank-f',
  ],
  theme: {
    extend: {
      colors: {
        // Brand accent — pulled from the logo's blue→violet→magenta gradient
        // (#2e3a8f → #53328e → #7e2a8e). Magenta is the hot end; use it as the
        // primary so the UI finally matches the wordmark.
        primary: {
          DEFAULT: '#c0398f',
          dark: '#7e2a8e',
          light: '#e469b6',
        },
        // Secondary = the cool end of the gradient, for two-tone accents.
        iris: {
          DEFAULT: '#4b46b0',
          dark: '#2e3a8f',
        },
        // Dark surfaces carry a violet undertone (NOT default Tailwind slate),
        // so the whole shell reads as branded rather than generic.
        dark: {
          bg: '#120f1c',
          card: '#1b1727',
          elevated: '#241f33',
          border: '#2e2942',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
        display: ['Comfortaa', 'cursive'],
      },
      backgroundImage: {
        'city-skyline': "url('/static/headers/default.jpg')",
        // Signature gradient — the logo, as a usable surface.
        'brand-gradient': 'linear-gradient(120deg, #2e3a8f 0%, #7e2a8e 55%, #c0398f 100%)',
        'brand-gradient-soft': 'linear-gradient(120deg, rgba(46,58,143,0.18), rgba(192,57,143,0.18))',
      },
      boxShadow: {
        // Coloured glow instead of the generic neutral drop shadow.
        glow: '0 8px 30px -8px rgba(192, 57, 143, 0.45)',
        'glow-sm': '0 2px 12px -4px rgba(192, 57, 143, 0.4)',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
};
