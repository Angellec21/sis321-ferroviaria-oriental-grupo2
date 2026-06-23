import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // En dev directo (localhost:5173) Vite proxea /api al backend.
    // Detrás de Nginx (https://localhost:8443) es Nginx quien proxea /api.
    // Así el frontend siempre usa una ruta relativa, sin mixed content.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
