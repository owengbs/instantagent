import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    global: 'globalThis',
    // 直接定义crypto polyfill
    'global.crypto': 'globalThis.crypto || { getRandomValues: (arr) => { for (let i = 0; i < arr.length; i++) { arr[i] = Math.floor(Math.random() * 256); } return arr; } }'
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:8000',
        changeOrigin: true,
        ws: true,
      }
    }
  },
  build: {
    rollupOptions: {
      external: [],
    },
    sourcemap: true,
    target: 'esnext',
  },
  // 添加环境变量
  envPrefix: 'VITE_'
}) 