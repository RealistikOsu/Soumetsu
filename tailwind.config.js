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
        primary: {
          DEFAULT: '#3B82F6',
          dark: '#2563EB',
        },
        dark: {
          bg: '#0F172A',
          card: '#1E293B',
          border: '#334155',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
        display: ['Comfortaa', 'cursive'],
      },
      backgroundImage: {
        'city-skyline': "url('/static/headers/default.jpg')",
      },
    },
  },
  plugins: [],
  darkMode: 'class',
};
