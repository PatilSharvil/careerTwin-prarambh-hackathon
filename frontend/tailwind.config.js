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
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        priority: {
          critical: '#ef4444',
          high: '#f97316',
          medium: '#f59e0b',
          low: '#64748b',
        },
        status: {
          locked: '#94a3b8',
          available: '#3b82f6',
          in_progress: '#8b5cf6',
          done: '#10b981',
        },
      },
    },
  },
  plugins: [],
}
