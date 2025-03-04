/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'rgba(140, 172, 141, 0.05)',
          100: 'rgba(140, 172, 141, 0.1)',
          200: 'rgba(140, 172, 141, 0.2)',
          300: 'rgba(140, 172, 141, 0.3)',
          400: 'rgba(140, 172, 141, 0.4)',
          500: 'rgba(140, 172, 141, 0.8)',  // Main primary color - Sage Green
          600: 'rgba(125, 154, 126, 0.8)',  // Darker sage
          700: 'rgba(125, 154, 126, 0.9)',
          800: 'rgba(125, 154, 126, 1)',
          900: 'rgba(98, 121, 99, 1)',
        },
        accent: {
          cream: '#F5E6D3',
          beige: '#E2D4C0',
          moss: '#A7B5A0',
          earth: '#9B8878'
        },
        dark: {
          100: '#2D2C2A',
          200: '#252422',
          300: '#1E1C1A',
          400: '#1C1A22',  // New sophisticated dark background
          500: '#151413',
          600: '#111010',
          700: '#0D0C0C',
          800: '#090808',
          900: '#050505',
        },
      },
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '24px',
      },
      backgroundOpacity: {
        '15': '0.15',
      },
      gradientColorStops: {
        'spa-gradient': {
          start: '#8CAC8D',
          middle: '#A7B5A0',
          end: '#E2D4C0',
        },
        'bg-gradient': {
          start: '#1C1A22',
          middle: '#201E26',
          end: '#1E1C1A',
        }
      },
    },
  },
  plugins: [],
} 