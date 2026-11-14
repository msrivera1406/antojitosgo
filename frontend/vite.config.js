import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

// VITE_HTTPS=1 activa HTTPS con certificado autofirmado. Hace falta para probar la geolocalización
// desde un teléfono por la red local, porque fuera de localhost el navegador la exige.
const usarHttps = process.env.VITE_HTTPS === '1';
const backend = process.env.VITE_BACKEND_URL || 'http://localhost:5000';

export default defineConfig({
  plugins: [react(), tailwindcss(), ...(usarHttps ? [basicSsl()] : [])],
  server: {
    host: true,
    port: 5173,
    proxy: { '/api': backend, '/static': backend },
  },
});
