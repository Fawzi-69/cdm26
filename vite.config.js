import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Déployé sur Vercel à la racine du domaine -> base '/'
export default defineConfig({
  plugins: [react()],
  base: '/',
})
