/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'apple-green': '#30D158',
        'apple-gray': {
          50: '#F5F5F7',
          100: '#E8E8ED',
          200: '#D2D2D7',
          300: '#B0B0B6',
          400: '#86868B',
          500: '#6E6E73',
          600: '#48484A',
          700: '#2C2C2E',
          800: '#1C1C1E',
          900: '#000000',
        },
      },
      fontFamily: {
        'sans': ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
      },
      fontSize: {
        'display': ['56px', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '600' }],
        'title1': ['34px', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '700' }],
        'title2': ['28px', { lineHeight: '1.25', letterSpacing: '-0.01em', fontWeight: '600' }],
        'title3': ['22px', { lineHeight: '1.3', letterSpacing: '0', fontWeight: '600' }],
        'headline': ['17px', { lineHeight: '1.4', letterSpacing: '0', fontWeight: '600' }],
        'body': ['17px', { lineHeight: '1.5', letterSpacing: '0', fontWeight: '400' }],
        'callout': ['16px', { lineHeight: '1.5', letterSpacing: '0', fontWeight: '400' }],
        'subhead': ['15px', { lineHeight: '1.4', letterSpacing: '0', fontWeight: '400' }],
        'footnote': ['13px', { lineHeight: '1.4', letterSpacing: '0', fontWeight: '400' }],
        'caption': ['12px', { lineHeight: '1.3', letterSpacing: '0', fontWeight: '400' }],
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },
      animation: {
        'slide-up': 'slideUp 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      boxShadow: {
        'apple-sm': '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        'apple': '0 4px 16px 0 rgba(0, 0, 0, 0.1)',
        'apple-lg': '0 10px 40px 0 rgba(0, 0, 0, 0.15)',
      },
    },
  },
  plugins: [],
}