/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        amber: {
          DEFAULT: '#F4A21A',
          deep: '#E0850A',
        },
        espresso: '#2A2018',
        crema: '#FBF6ED',
        go: '#12A46A',
        danger: '#D6503F',
      },
    },
  },
  plugins: [],
};
