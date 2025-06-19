import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'  // Use SWC version instead
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Include specific polyfills you need
      include: ['buffer', 'process', 'events', 'stream', 'crypto']
    })
  ],
  
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
  },
  
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})