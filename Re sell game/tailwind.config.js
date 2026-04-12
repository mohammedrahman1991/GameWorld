/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        storybook: ['"Fredoka One"', 'cursive'],
      },
      colors: {
        coin: '#F5C842',
        stall: '#8B5E3C',
      },
    },
  },
  plugins: [],
}
