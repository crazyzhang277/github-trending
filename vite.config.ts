import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function localTrendingApiPlugin(): Plugin {
  return {
    name: 'local-trending-api',
    configureServer(server) {
      server.middlewares.use('/api/trending', async (req, res, next) => {
        if (req.method !== 'GET') {
          next();
          return;
        }

        try {
          const { scrapeTrending } = await import('./api/trending.js');
          const url = new URL(req.url || '/', 'http://localhost');
          const language = url.searchParams.get('language') || '';
          const since = url.searchParams.get('since') || 'daily';
          const spoken = url.searchParams.get('spoken') || '';

          const repos = await scrapeTrending({ language, since, spoken });
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(repos));
        } catch (error) {
          console.error('Vite local /api/trending error:', error);
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(
            JSON.stringify({
              error: 'Failed to fetch trending repositories from GitHub.',
            })
          );
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), localTrendingApiPlugin()],
  base: process.env.VITE_BASE_PATH || '/',
});
