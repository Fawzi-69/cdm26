/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Palette festive (CdM "fiesta")
        brand: {
          DEFAULT: '#7c3aed', // violet vif
          dark: '#5b21b6',
          light: '#a78bfa',
        },
      },
      backgroundImage: {
        fiesta: 'linear-gradient(135deg, #7c3aed 0%, #db2777 55%, #f59e0b 100%)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
