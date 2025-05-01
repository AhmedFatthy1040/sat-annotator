import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const API_BASE = env.VITE_API_URL || '/api';
  const API_PROXY_TARGET = env.VITE_API_PROXY_TARGET || 'http://localhost:8000'; // default for local dev

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      proxy: {
        [API_BASE]: {
          target: API_PROXY_TARGET,
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on('error', (err) => {
              // Silence specific errors to prevent console spam
              if (!err.message?.includes('ECONNREFUSED')) {
                console.error('Proxy error:', err);
              }
            });
          }
        },
        '/uploads': {
          target: API_PROXY_TARGET,
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on('error', (err) => {
              // Silence specific errors to prevent console spam
              if (!err.message?.includes('ECONNREFUSED')) {
                console.error('Proxy error:', err);
              }
            });
          }
        },
      },
    },
    preview: {
      port: 5173,
      host: true,
    },
  };
});
