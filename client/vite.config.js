import react from 'react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  
  // Use ESBuild for React (built into Vite)
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react'
  },
  
  build: {
    outDir: 'dist',
  },
  
  server: {
    port: 3000,
    host: true
  },
  
  define: {
    global: 'globalThis',
    'process.env': {}
  }
})