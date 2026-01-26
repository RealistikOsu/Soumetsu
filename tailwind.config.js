/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./web/templates/**/*.html",
    "./web/static/**/*.js",
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
}
