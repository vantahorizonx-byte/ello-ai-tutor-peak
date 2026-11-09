import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'web',
  // Relative asset URLs so the built folder runs from any static host,
  // sub-path or plain file server with no rewrite rules.
  base: './',
  plugins: [react()],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    sourcemap: false,
    target: 'es2022',
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:5178',
      '/media': 'http://127.0.0.1:5178',
    },
  },
});
