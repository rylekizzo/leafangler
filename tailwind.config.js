/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'leaf-light': '#8FD14F',
        'leaf-main': '#5CB85C',
        'leaf-dark': '#2E7D32',
        'protractor': '#1B5E20',
        'accent': '#A5D6A7',
        'glass': 'rgba(255, 255, 255, 0.1)',
        'glass-border': 'rgba(255, 255, 255, 0.2)',
      },
      backgroundImage: {
        'gradient-leaf': 'linear-gradient(135deg, #8FD14F 0%, #5CB85C 50%, #2E7D32 100%)',
        'gradient-dark': 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 100%)',
        'gradient-radial': 'radial-gradient(ellipse at top, #8FD14F, #2E7D32)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'slide-in': 'slideIn 0.5s ease-out',
        'fade-in': 'fadeIn 0.5s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}