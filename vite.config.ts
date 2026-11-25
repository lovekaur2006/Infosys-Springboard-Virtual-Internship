import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          configure: (proxy) => {
            // When the backend API (port 3001) is not running (e.g. plain `npm run dev`),
            // handle ECONNREFUSED gracefully with HTTP 503 instead of crashing Vite with unhandled AggregateError.
            process.nextTick(() => {
              proxy.removeAllListeners('error');
              proxy.on('error', (err: any, req: any, res: any) => {
                const isConnRefused =
                  err?.code === 'ECONNREFUSED' ||
                  (err instanceof AggregateError && err.errors.some((e: any) => e?.code === 'ECONNREFUSED')) ||
                  String(err?.message || '').includes('ECONNREFUSED');

                if (res && 'req' in res && !res.headersSent && !res.writableEnded) {
                  if (isConnRefused) {
                    res.writeHead(503, { 'Content-Type': 'application/json' });
                    res.end(
                      JSON.stringify({
                        error: 'Database API unavailable on port 3001. Operating in local mode.',
                        code: 'ECONNREFUSED',
                      })
                    );
                  } else {
                    console.error('[vite proxy error]', req?.url, err);
                    res.writeHead(502, { 'Content-Type': 'application/json' });
                    res.end(
                      JSON.stringify({
                        error: 'Proxy failure while forwarding request to backend API.',
                        code: err?.code || 'PROXY_ERROR',
                        message: err?.message || 'Unknown proxy error',
                      })
                    );
                  }
                }
              });
            });
          },
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
