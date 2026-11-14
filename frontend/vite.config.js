import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En desarrollo, las llamadas /api y /static van al servidor Flask (puerto 5000).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: true },
      '/static/uploads': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
});
