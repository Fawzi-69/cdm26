import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Domaine personnalisé cdm26.is-a.dev -> servi à la racine, donc base '/'
export default defineConfig({
  plugins: [react()],
  base: '/',
})
