import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' : nécessaire pour être servi depuis la webview Tauri plus tard
export default defineConfig({
  plugins: [react()],
  base: './',
})
