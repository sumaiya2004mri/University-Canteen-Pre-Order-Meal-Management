/** @type {import('tailwind.config.js').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#70452F',
          dark: '#543321',
          secondary: '#98745F',
          gray: '#55565A',
          black: '#202020',
          ivory: '#F6F3EF',
          beige: '#EEE7E0',
          border: '#E5DED8',
          gold: '#B78A45',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
