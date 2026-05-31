/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        base: '#0a0e13',
        panel: '#131820',
        textmain: '#e8eaed',
        xp: '#4ade80',
        level: '#a78bfa',
        combo: '#ffb547',
      },
      boxShadow: {
        glow: '0 0 30px rgba(255, 181, 71, 0.25)',
      },
      keyframes: {
        pulseFlash: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.04)', opacity: '0.95' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        pulseFlash: 'pulseFlash 300ms ease-in-out',
      },
    },
  },
  plugins: [],
};
