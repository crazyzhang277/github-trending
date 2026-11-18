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

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Backend server running at http://localhost:${PORT}`);
  });
}

export default app;
