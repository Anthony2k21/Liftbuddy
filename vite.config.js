import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
  },
  optimizeDeps: {
    include: [
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      'zustand',
      'suspend-react',
      'maath',
      '@supabase/supabase-js',
    ],
  },
  server: {
    open: false,
  }
})