// Cloudflare Pages Function
export async function onRequest(context) {
  const { request } = context;

  // CORS headers
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

    const trendingUrl = `https://github.com/trending${language ? `/${language}` : ''}?since=${since}`;

    const response = await fetch(trendingUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
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
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
}

function parseGitHubTrending(html) {
  const repos = [];

  // 使用正则表达式解析 HTML
  const repoPattern = /<article class="Box-row">[\s\S]*?<\/article>/g;
  const matches = html.match(repoPattern) || [];

  for (const match of matches) {
    try {
      // 提取仓库链接
      const linkMatch = match.match(/href="(\/[^\/]+\/[^"]+)"/);
      if (!linkMatch) continue;

      const repoPath = linkMatch[1];
      const [, author, name] = repoPath.split('/');

      // 提取描述
      const descMatch = match.match(/<p class="col-9[^>]*>([\s\S]*?)<\/p>/);
      const description = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : '';

      // 提取语言
      const langMatch = match.match(/itemprop="programmingLanguage">([^<]+)</);
      const language = langMatch ? langMatch[1].trim() : '';

      // 提取语言颜色
      const colorMatch = match.match(/background-color:\s*([^;"]+)/);
      const languageColor = colorMatch ? colorMatch[1].trim() : '#586069';

      // 提取 stars
      const starsMatch = match.match(/href="[^"]*\/stargazers"[^>]*>[\s\S]*?([\d,]+)/);
      const stars = starsMatch ? parseInt(starsMatch[1].replace(/,/g, '')) : 0;

      // 提取 forks
      const forksMatch = match.match(/href="[^"]*\/forks"[^>]*>[\s\S]*?([\d,]+)/);
      const forks = forksMatch ? parseInt(forksMatch[1].replace(/,/g, '')) : 0;

      // 提取今日 stars
      const todayStarsMatch = match.match(/class="float-sm-right">[\s\S]*?([\d,]+)/);
      const currentPeriodStars = todayStarsMatch ? parseInt(todayStarsMatch[1].replace(/,/g, '')) : 0;

      // 提取贡献者头像
      const builtBy = [];
      const avatarPattern = /<img[^>]+class="avatar[^>]+src="([^"]+)"[^>]+alt="@([^"]+)"/g;
      let avatarMatch;
      while ((avatarMatch = avatarPattern.exec(match)) !== null) {
        builtBy.push({
          username: avatarMatch[2],
          href: `https://github.com/${avatarMatch[2]}`,
          avatar: avatarMatch[1]
        });
      }

      repos.push({
        author,
        name,
        avatar: `https://github.com/${author}.png`,
        url: `https://github.com${repoPath}`,
        description,
        language,
        languageColor,
        stars,
        forks,
        currentPeriodStars,
        builtBy
      });
    } catch (e) {
      console.error('Parse error:', e);
    }
  }

  return repos;
}
