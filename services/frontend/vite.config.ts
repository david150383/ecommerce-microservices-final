import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const gatewayUrl = process.env.VITE_GATEWAY_URL || 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/auth': {
        target: gatewayUrl,
        changeOrigin: true,
      },
      '/products': {
        target: gatewayUrl,
        changeOrigin: true,
      },
      '/inventory': {
        target: gatewayUrl,
        changeOrigin: true,
      },
      '/orders': {
        target: gatewayUrl,
        changeOrigin: true,
      },
      '/payments': {
        target: gatewayUrl,
        changeOrigin: true,
      },
      '/health': {
        target: gatewayUrl,
        changeOrigin: true,
      },
      '/api': {
        target: gatewayUrl,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api(\/v1)?/, ''),
      },
    },
  },
});
