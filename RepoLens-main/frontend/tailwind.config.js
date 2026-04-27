/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ember:  '#E45B11',
        flame:  '#F4860D',
        torch:  '#F8AB0B',
        gold:   '#FBC255',
        cream:  '#E2E4D5',
        ash:    '#B0B2A3',
        slate:  '#585B4A',
        void:   '#222222',
      },
      fontFamily: {
        syne: ['Syne', 'sans-serif'],
        sans: ['DM Sans', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};