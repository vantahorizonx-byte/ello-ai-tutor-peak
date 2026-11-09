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
    // Split the two large vendor libraries into their own chunks so no single
    // bundle trips the 500 kB warning and browsers can cache them separately.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'react';
            if (id.includes('firebase/firestore') || id.includes('@firebase/firestore')) return 'firebase-firestore';
            if (id.includes('firebase/auth') || id.includes('@firebase/auth')) return 'firebase-auth';
            if (id.includes('firebase') || id.includes('@firebase')) return 'firebase-core';
          }
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:5178',
      '/media': 'http://127.0.0.1:5178',
    },
  },
});
