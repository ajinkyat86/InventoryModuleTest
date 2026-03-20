/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        code: ['Nanum Gothic Coding', 'monospace'],
      },
      colors: {
        'primary-green': '#007019',
        'secondary-green': '#EAF1EB',
        'primary-gray-dark': '#AAAAAA',
        'primary-gray-light': '#F9F9F9',
        'secondary-gray-light': '#EEEEEE',
      },
      borderRadius: {
        DEFAULT: '8px',
      },
      keyframes: {
        dialogScale: { from: { opacity: 0, transform: 'scale(0.95)' }, to: { opacity: 1, transform: 'scale(1)' } },
        dialogFade: { from: { opacity: 0 }, to: { opacity: 1 } },
        overlayFade: { from: { opacity: 0 }, to: { opacity: 0.5 } },
        fadeIn: { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      },
      animation: {
        dialogScale: 'dialogScale 0.2s ease-out',
        dialogFade: 'dialogFade 0.15s ease-out',
        overlayFade: 'overlayFade 0.15s ease-out',
        fadeIn: 'fadeIn 0.3s ease-out',
      },
    },
  },
  plugins: [],
}
