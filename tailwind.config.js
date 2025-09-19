/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand primary colors (dark navy from chart)
        'brand-navy': '#0e1821',
        'brand-navy-light': '#1a2332',
        
        // Brand secondary colors
        'brand-gray': '#c7c9ca',
        'brand-light-gray': '#f5f5f5',
        
        // Chart colors
        'chart-red': '#f85c5d',
        'chart-green': '#99f094',
        'chart-purple': '#9468ce', // This is light-purple
        
        // Sector colors
        'sector-tech': '#ff9100',
        'sector-services': '#00b0ff',
        'sector-healthcare': '#122fa8',
        'sector-consumer': '#e5404f',
        
        // Utility colors
        'white': '#ffffff',
        'dark-purple': '#6B21A8', // New color for Apax EP
        'light-purple': '#9468ce',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}