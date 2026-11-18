// Cloudflare Pages Function
const VALID_SINCE = new Set(['daily', 'weekly', 'monthly']);

const NAMED_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

function decodeHtmlEntities(str) {
  if (!str) return '';
  return str.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (full, entity) => {
    if (entity[0] === '#') {
      const code =
        entity[1] === 'x' || entity[1] === 'X'
          ? parseInt(entity.slice(2), 16)
          : parseInt(entity.slice(1), 10);
      if (!Number.isNaN(code)) {
        try {
          return String.fromCodePoint(code);
        } catch {
          return full;
        }
      }
      return full;
    }
    return NAMED_ENTITIES[entity] ?? full;
  });
}

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

export async function onRequest(context) {
  const { request } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(request.url);
    const language = url.searchParams.get('language') || '';
    const since = url.searchParams.get('since') || 'daily';
    const spoken = url.searchParams.get('spoken') || '';
    const refresh = url.searchParams.get('refresh') || '';

    const trendingUrl = buildTrendingUrl({ language, since, spoken });

    const response = await fetch(trendingUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub returned ${response.status}`);
    }

    const html = await response.text();
    const repos = parseGitHubTrending(html);

    return new Response(JSON.stringify(repos), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': refresh
          ? 'no-store'
          : 'public, max-age=60, s-maxage=180, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 502,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

export function parseGitHubTrending(html) {
  const repos = [];
  const repoPattern = /<article\b[^>]*class="[^"]*Box-row[^"]*"[^>]*>[\s\S]*?<\/article>/g;
  const matches = html.match(repoPattern) || [];

  for (const match of matches) {
    try {
      // Match the repo link strictly inside <h2> so Sponsor buttons (/sponsors/...) are never picked up
      const h2Match = match.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/);
      if (!h2Match) continue;

      const linkMatch = h2Match[1].match(/href="(\/[^/"\s]+\/[^/"\s?#]+)"/);
      if (!linkMatch) continue;

      const parts = linkMatch[1].split('/').filter(Boolean);
      if (parts.length < 2) continue;
      const [author, name] = parts;

      const descMatch = match.match(/<p\b[^>]*>([\s\S]*?)<\/p>/);
      const description = descMatch
        ? decodeHtmlEntities(descMatch[1].replace(/<[^>]+>/g, ''))
            .replace(/\s+/g, ' ')
            .trim()
        : '';

      const langMatch = match.match(/itemprop="programmingLanguage"[^>]*>([^<]+)</);
      const language = langMatch ? decodeHtmlEntities(langMatch[1]).trim() : '';

      const colorMatch = match.match(
        /class="[^"]*repo-language-color[^"]*"[^>]*style="[^"]*background-color:\s*([^;"]+)/
      );
      const languageColor = colorMatch
        ? colorMatch[1].trim()
        : language
          ? '#64748b'
          : '';

      const starsMatch = match.match(/<a\b[^>]*href="[^"]*\/stargazers"[^>]*>([\s\S]*?)<\/a>/);
      const starsDigits = starsMatch
        ? starsMatch[1].replace(/<[^>]+>/g, '').replace(/[^0-9]/g, '')
        : '';
      const stars = parseInt(starsDigits, 10) || 0;

      const forksMatch = match.match(/<a\b[^>]*href="[^"]*\/forks"[^>]*>([\s\S]*?)<\/a>/);
      const forksDigits = forksMatch
        ? forksMatch[1].replace(/<[^>]+>/g, '').replace(/[^0-9]/g, '')
        : '';
      const forks = parseInt(forksDigits, 10) || 0;

      const periodMatch = match.match(
        /<span\b[^>]*class="[^"]*float-sm-right[^"]*"[^>]*>([\s\S]*?)<\/span>/
      );
      const periodDigits = periodMatch
        ? periodMatch[1].replace(/<[^>]+>/g, '').replace(/[^0-9]/g, '')
        : '';
      const currentPeriodStars = parseInt(periodDigits, 10) || 0;

      const builtBy = [];
      const linkImgPattern = /<a\b([^>]*)>\s*<img\b([^>]*)>\s*<\/a>/g;
      let avatarMatch;
      while ((avatarMatch = linkImgPattern.exec(match)) !== null) {
        const aAttrs = avatarMatch[1];
        const imgAttrs = avatarMatch[2];
        if (!/\bavatar\b/.test(imgAttrs)) continue;

        const hrefMatch = aAttrs.match(/href="([^"]+)"/);
        const srcMatch = imgAttrs.match(/src="([^"]+)"/);
        const altMatch = imgAttrs.match(/alt="([^"]+)"/);

        const hrefPath = hrefMatch ? decodeHtmlEntities(hrefMatch[1]).trim() : '';
        const src = srcMatch ? decodeHtmlEntities(srcMatch[1]).trim() : '';
        const rawAlt = altMatch ? decodeHtmlEntities(altMatch[1]).replace(/^@/, '').trim() : '';
        const username = rawAlt || hrefPath.split('/').filter(Boolean).pop() || '';

        if (!username || !src) continue;

        builtBy.push({
          username,
          href: hrefPath.startsWith('http')
            ? hrefPath
            : `https://github.com${hrefPath || `/${username}`}`,
          avatar: src,
        });
      }

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
    } catch (e) {
      console.error('Parse error:', e);
    }
  }

  return repos;
}
