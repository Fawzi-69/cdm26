import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base must match the GitHub Pages repo name for correct asset paths
export default defineConfig({
  plugins: [react()],
  base: '/cdm26/',
})
