import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Keep the bundle small for 2G/3G phones
    target: 'es2018',
    minify: 'esbuild',
    sourcemap: false
  }
});
