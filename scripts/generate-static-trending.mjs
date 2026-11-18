import fs from 'node:fs/promises';
import path from 'node:path';
import { scrapeTrending } from '../api/trending.js';

const FEATURED_LANGUAGES = [
  'all',
  'python',
  'typescript',
  'javascript',
  'go',
  'rust',
  'c++',
  'java',
  'c#',
  'shell',
  'vue',
];

const TIME_RANGES = ['daily', 'weekly', 'monthly'];

function toStaticLanguageKey(language) {
  const normalized = (language || 'all').trim().toLowerCase();
  if (!normalized || normalized === 'all') return 'all';
  if (normalized === 'c++') return 'cpp';
  if (normalized === 'c#') return 'csharp';
  return normalized.replace(/[^a-z0-9-]/g, '-');
}

async function scrapeWithRetry(language, since, retries = 2) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await scrapeTrending({ language, since });
    } catch (err) {
      lastError = err;
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
  throw lastError;
}

async function main() {
  const outDir = path.resolve(process.cwd(), 'dist', 'data', 'trending');
  await fs.mkdir(outDir, { recursive: true });

  const tasks = [];
  for (const since of TIME_RANGES) {
    for (const language of FEATURED_LANGUAGES) {
      tasks.push({ language, since });
    }
  }

  let succeeded = 0;
  const concurrency = 4;

  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async ({ language, since }) => {
        try {
          const repos = await scrapeWithRetry(language, since);
          const file = `${toStaticLanguageKey(language)}_${since}.json`;
          await fs.writeFile(path.join(outDir, file), JSON.stringify(repos));
          succeeded++;
        } catch (err) {
          console.warn(`Skipped ${language}/${since}:`, err?.message || err);
        }
      })
    );
  }

  await fs.writeFile(
    path.join(outDir, 'meta.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), count: succeeded })
  );

  console.log(`Generated ${succeeded}/${tasks.length} trending snapshots in ${outDir}`);
  if (succeeded === 0) {
    process.exitCode = 1;
  }
}

main();
