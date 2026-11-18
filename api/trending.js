import axios from 'axios';
import * as cheerio from 'cheerio';

const VALID_SINCE = new Set(['daily', 'weekly', 'monthly']);

export function buildTrendingUrl({ language = '', since = 'daily', spoken = '' }) {
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

export function parseTrendingHtml(html) {
  const $ = cheerio.load(html);
  const repos = [];

  $('article.Box-row').each((_, element) => {
    const $repo = $(element);

    const repoLink = ($repo.find('h2 a').attr('href') || '').trim();
    const parts = repoLink.split('/').filter(Boolean);
    if (parts.length < 2) return;

    const [author, name] = parts;
    const description = $repo.find('p').first().text().replace(/\s+/g, ' ').trim();

    const language = $repo.find('[itemprop="programmingLanguage"]').text().trim();
    const languageColor =
      $repo.find('.repo-language-color').css('background-color') ||
      (language ? '#64748b' : '');

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

    const periodText = $repo.find('span.float-sm-right').first().text().trim();
    const currentPeriodStars = parseInt(periodText.replace(/[^0-9]/g, ''), 10) || 0;

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
      language,
      languageColor,
      stars,
      forks,
      currentPeriodStars,
      builtBy,
    });
  });

  return repos;
}

export async function scrapeTrending({ language = '', since = 'daily', spoken = '' }) {
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

  return parseTrendingHtml(data);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { language = '', since = 'daily', spoken = '', refresh = '' } = req.query || {};
    const repos = await scrapeTrending({ language, since, spoken });

    if (refresh) {
      res.setHeader('Cache-Control', 'no-store');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=180, stale-while-revalidate=300');
    }

    res.status(200).json(repos);
  } catch (error) {
    console.error('Error fetching GitHub trending:', error?.message || error);
    const status = error?.response?.status === 429 ? 429 : 502;
    res.status(status).json({
      error:
        status === 429
          ? 'GitHub rate limit reached, please try again shortly.'
          : 'Failed to fetch trending repositories from GitHub.',
    });
  }
}
