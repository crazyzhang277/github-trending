import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  // 允许跨域
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { language = '', since = 'daily' } = req.query;

    const url = `https://github.com/trending${language ? `/${language}` : ''}?since=${since}`;
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(data);
    const repos = [];

    $('article.Box-row').each((_, element) => {
      const $repo = $(element);

      const repoLink = $repo.find('h2 a').attr('href') || '';
      const [, author, name] = repoLink.split('/');

      const description = $repo.find('p.col-9').text().trim();

      const language = $repo.find('[itemprop="programmingLanguage"]').text().trim();
      const languageColor = $repo.find('.repo-language-color').css('background-color') || '#586069';

      const starsText = $repo.find('a[href$="/stargazers"]').text().trim().replace(/,/g, '');
      const stars = parseInt(starsText) || 0;

      const forksText = $repo.find('a[href$="/forks"]').text().trim().replace(/,/g, '');
      const forks = parseInt(forksText) || 0;

      const starsToday = $repo.find('.float-sm-right').text().trim();
      const currentPeriodStars = parseInt(starsToday.replace(/[^0-9]/g, '')) || 0;

      const builtBy = [];
      $repo.find('.avatar-user').each((_, avatarEl) => {
        const $avatar = $(avatarEl);
        builtBy.push({
          username: $avatar.attr('alt')?.replace('@', '') || '',
          href: `https://github.com${$avatar.parent().attr('href')}`,
          avatar: $avatar.attr('src') || ''
        });
      });

      repos.push({
        author,
        name,
        avatar: `https://github.com/${author}.png`,
        url: `https://github.com${repoLink}`,
        description,
        language,
        languageColor,
        stars,
        forks,
        currentPeriodStars,
        builtBy
      });
    });

    res.status(200).json(repos);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch trending repositories' });
  }
}
