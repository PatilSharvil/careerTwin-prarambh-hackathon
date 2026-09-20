/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        neo: {
          bg: '#faf6ee',
          cream: '#fdfbf7',
          yellow: '#ffe566',
          yellowDark: '#ffd026',
          pink: '#ff70a6',
          pinkLight: '#ff9ebb',
          cyan: '#70d6ff',
          green: '#79e7a8',
          purple: '#b892ff',
          orange: '#ff9770',
          black: '#121212',
        },
        primary: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#ffd026',
          700: '#eab308',
          800: '#ca8a04',
          900: '#854d0e',
        },
        priority: {
          critical: '#ff6b6b',
          high: '#ff9770',
          medium: '#ffd166',
          low: '#94a3b8',
        },
        status: {
          locked: '#cbd5e1',
          available: '#70d6ff',
          in_progress: '#b892ff',
          done: '#79e7a8',
        },
      },
      boxShadow: {
        'neo-xs': '1.5px 1.5px 0px 0px #000000',
        'neo-sm': '2px 2px 0px 0px #000000',
        'neo': '3.5px 3.5px 0px 0px #000000',
        'neo-lg': '5px 5px 0px 0px #000000',
        'neo-xl': '8px 8px 0px 0px #000000',
      },
      borderWidth: {
        '3': '3px',
      },
    },
  },
  plugins: [],
}
