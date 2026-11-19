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

      server.middlewares.use('/api/readme', async (req, res, next) => {
        if (req.method !== 'GET') {
          next();
          return;
        }

        try {
          const { fetchReadmeServer } = await import('./api/readme.js');
          const url = new URL(req.url || '/', 'http://localhost');
          const owner = url.searchParams.get('owner') || '';
          const repo = url.searchParams.get('repo') || '';
          const result = await fetchReadmeServer(owner, repo);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(result));
        } catch (error) {
          const errObj = error as { statusCode?: number; message?: string } | null;
          const status = errObj?.statusCode === 400 ? 400 : errObj?.statusCode === 404 ? 404 : 502;
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(
            JSON.stringify({
              error: errObj?.message || 'Failed to fetch README.',
            })
          );
        }
      });

      server.middlewares.use('/api/translate', (req, res, next) => {
        if (req.method !== 'POST') {
          next();
          return;
        }

        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', async () => {
          try {
            const raw = Buffer.concat(chunks).toString('utf-8');
            const parsed = JSON.parse(raw || '{}') as { texts?: unknown };
            const texts = Array.isArray(parsed.texts)
              ? parsed.texts.map((item) => String(item)).slice(0, 80)
              : [];
            if (texts.length === 0) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: 'No texts provided' }));
              return;
            }
            const { translateTextsServer } = await import('./api/translate.js');
            const translations = await translateTextsServer(texts);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ translations }));
          } catch (error) {
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(
              JSON.stringify({
                error: error instanceof Error ? error.message : 'Translation failed',
              })
            );
          }
        });
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), localTrendingApiPlugin()],
  base: process.env.VITE_BASE_PATH || '/',
});
