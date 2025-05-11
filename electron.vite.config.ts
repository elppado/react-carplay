import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  main: {
    build: {
      outDir: 'out/main',
      minify: true,
      sourcemap: false
    }
  },
  preload: {
    build: {
      outDir: 'out/preload',
      minify: true,
      sourcemap: false
    }
  },
  renderer: {
    root: path.join(__dirname, 'src/renderer'),
    build: {
      outDir: 'out/renderer',
      minify: true,
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            'carplay': ['node-carplay/web'],
            'vendor': ['react', 'react-dom', 'react-router-dom'],
            'mui': ['@mui/material', '@mui/icons-material']
          }
        }
      }
    },
    plugins: [react()]
  }
})
