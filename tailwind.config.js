/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Vert CdM vif et festif (monochrome, cohérent)
        brand: {
          DEFAULT: '#15803d', // vert vif
          dark: '#0f5c2e',
          light: '#22c55e',
        },
      },
      backgroundImage: {
        // Dégradé vert festif (même teinte) + touche émeraude
        fiesta: 'linear-gradient(135deg, #16a34a 0%, #15803d 55%, #0f766e 100%)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
