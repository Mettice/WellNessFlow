import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
        timeout: 60000,
        proxyTimeout: 60000,
        configure: (proxy, _options) => {
          proxy.on('error', (err, req, res) => {
            console.error('Proxy Error:', {
              error: err.message,
              path: req.url,
              method: req.method
            });
            if (!res.headersSent) {
              res.writeHead(500, {
                'Content-Type': 'application/json'
              });
              res.end(JSON.stringify({ error: 'Proxy Error', details: err.message }));
            }
          });
          proxy.on('proxyReq', (_proxyReq, req, _res) => {
            console.log('Sending Request:', {
              method: req.method,
              url: req.url,
              headers: req.headers
            });
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            const contentType = proxyRes.headers['content-type'] || '';
            if (contentType.includes('application/json')) {
              let body = '';
              proxyRes.on('data', chunk => body += chunk);
              proxyRes.on('end', () => {
                try {
                  const parsedBody = JSON.parse(body);
                  console.log('Response:', {
                    statusCode: proxyRes.statusCode,
                    url: req.url,
                    body: parsedBody
                  });
                } catch (e) {
                  console.error('Error parsing response:', body);
                }
              });
            }
          })
        }
      }
    }
  }
})
