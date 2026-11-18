import express from 'express';
import cors from 'cors';
import axios from 'axios';
import * as cheerio from 'cheerio';

const app = express();
const PORT = process.env.PORT || 3001;
const VALID_SINCE = new Set(['daily', 'weekly', 'monthly']);

app.use(cors());
app.use(express.json());

function buildTrendingUrl({ language = '', since = 'daily', spoken = '' }) {
  const normalizedLang = String(language || '').trim().toLowerCase();
  const normalizedSince = VALID_SINCE.has(since) ? since : 'daily';
  const normalizedSpoken = String(spoken || '').trim().toLowerCase();

  const langSegment =
    normalizedLang && normalizedLang !== 'all'
      ? `/${encodeURIComponent(normalizedLang)}`
      : '';

  const params = new URLSearchParams({ since: normalizedSince });
  if (
    normalizedSpoken &&
    normalizedSpoken !== 'all' &&
    /^[a-z]{2,3}(-[a-z0-9]+)?$/i.test(normalizedSpoken)
  ) {
    params.set('spoken_language_code', normalizedSpoken);
  }

  return `https://github.com/trending${langSegment}?${params.toString()}`;
}

async function scrapeTrending(language = '', since = 'daily', spoken = '') {
  const url = buildTrendingUrl({ language, since, spoken });
  const { data } = await axios.get(url, {
    timeout: 12000,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  const $ = cheerio.load(data);
  const repos = [];

  $('article.Box-row').each((_, element) => {
    const $repo = $(element);

    const repoLink = ($repo.find('h2 a').attr('href') || '').trim();
    const parts = repoLink.split('/').filter(Boolean);
    if (parts.length < 2) return;

    const [author, name] = parts;
    const description = $repo.find('p').first().text().replace(/\s+/g, ' ').trim();

    const repoLanguage = $repo.find('[itemprop="programmingLanguage"]').text().trim();
    const languageColor =
      $repo.find('.repo-language-color').css('background-color') ||
      (repoLanguage ? '#64748b' : '');

    const starsText = $repo
      .find('a[href$="/stargazers"]')
      .first()
      .text()
      .replace(/[^0-9]/g, '');
    const stars = parseInt(starsText, 10) || 0;

    const forksText = $repo
      .find('a[href$="/forks"]')
      .first()
      .text()
      .replace(/[^0-9]/g, '');
    const forks = parseInt(forksText, 10) || 0;

    const starsToday = $repo.find('span.float-sm-right').first().text().trim();
    const currentPeriodStars = parseInt(starsToday.replace(/[^0-9]/g, ''), 10) || 0;

    const builtBy = [];
    $repo.find('a img.avatar').each((_, avatarEl) => {
      const $avatar = $(avatarEl);
      const hrefPath = ($avatar.closest('a').attr('href') || '').trim();
      const rawAlt = ($avatar.attr('alt') || '').replace(/^@/, '').trim();
      const username = rawAlt || hrefPath.split('/').filter(Boolean).pop() || '';
      const src = ($avatar.attr('src') || '').trim();

      if (!username || !src) return;

      builtBy.push({
        username,
        href: hrefPath.startsWith('http')
          ? hrefPath
          : `https://github.com${hrefPath || `/${username}`}`,
        avatar: src,
      });
    });

    repos.push({
      author,
      name,
      avatar: `https://github.com/${encodeURIComponent(author)}.png?size=80`,
      url: `https://github.com/${author}/${name}`,
      description,
      language: repoLanguage,
      languageColor,
      stars,
      forks,
      currentPeriodStars,
      builtBy,
    });
  });

  return repos;
}

app.get('/api/trending', async (req, res) => {
  try {
    const { language = '', since = 'daily', spoken = '' } = req.query;
    const repos = await scrapeTrending(String(language), String(since), String(spoken));
    res.json(repos);
  } catch (error) {
    console.error('API Error:', error?.message || error);
    const status = error?.response?.status === 429 ? 429 : 502;
    res.status(status).json({
      error:
        status === 429
          ? 'GitHub rate limit reached, please try again shortly.'
          : 'Failed to fetch trending repositories from GitHub.',
    });
  }
});

app.get('/api/readme', async (req, res) => {
  try {
    const owner = String(req.query.owner || '').trim();
    const repo = String(req.query.repo || '').trim();
    if (!/^[a-zA-Z0-9._-]+$/.test(owner) || !/^[a-zA-Z0-9._-]+$/.test(repo)) {
      res.status(400).json({ error: 'Invalid repository owner or name' });
      return;
    }

    const encodedOwner = encodeURIComponent(owner);
    const encodedRepo = encodeURIComponent(repo);

    for (const candidate of ['README.md', 'readme.md']) {
      try {
        const rawRes = await axios.get(
          `https://raw.githubusercontent.com/${encodedOwner}/${encodedRepo}/HEAD/${candidate}`,
          {
            timeout: 8000,
            responseType: 'text',
            transformResponse: [(data) => data],
            headers: { 'User-Agent': 'github-trending-web/1.0' },
          }
        );
        if (typeof rawRes.data === 'string' && rawRes.data.length > 0) {
          res.json({
            content: rawRes.data,
            fileName: candidate,
            branch: 'HEAD',
            baseDir: '',
            htmlUrl: `https://github.com/${encodedOwner}/${encodedRepo}/blob/HEAD/${candidate}`,
          });
          return;
        }
      } catch {
        // Fall through
      }
    }

    const apiRes = await axios.get(
      `https://api.github.com/repos/${encodedOwner}/${encodedRepo}/readme`,
      {
        timeout: 10000,
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'github-trending-web/1.0',
        },
      }
    );
    const data = apiRes.data || {};
    let content = '';
    if (data.content && data.encoding === 'base64') {
      content = Buffer.from(String(data.content).replace(/\s+/g, ''), 'base64').toString('utf-8');
    } else if (data.download_url) {
      const dlRes = await axios.get(data.download_url, {
        timeout: 8000,
        responseType: 'text',
        transformResponse: [(raw) => raw],
      });
      content = String(dlRes.data || '');
    }

    if (!content) {
      res.status(404).json({ error: 'README not found' });
      return;
    }

    const filePath = data.path || data.name || 'README.md';
    const dlMatch = data.download_url?.match(
      /^https:\/\/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/([^/]+)\//
    );
    const slashIdx = filePath.lastIndexOf('/');
    res.json({
      content,
      fileName: data.name || 'README.md',
      branch: dlMatch?.[1] || 'HEAD',
      baseDir: slashIdx >= 0 ? filePath.slice(0, slashIdx) : '',
      htmlUrl: data.html_url || `https://github.com/${encodedOwner}/${encodedRepo}`,
    });
  } catch (error) {
    const status = error?.response?.status === 404 ? 404 : 502;
    res.status(status).json({ error: 'Failed to fetch README' });
  }
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Backend server running at http://localhost:${PORT}`);
  });
}

export default app;
