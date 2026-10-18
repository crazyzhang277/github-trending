import express from 'express';
import cors from 'cors';
import axios from 'axios';
import * as cheerio from 'cheerio';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

async function scrapeTrending(language = '', since = 'daily') {
  try {
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
      const [author, name] = repoLink.replace('/', '').split('/');

      const description = $repo.find('p.col-9').text().trim();

      const language = $repo.find('[itemprop="programmingLanguage"]').text().trim();
      const languageColor = $repo.find('.repo-language-color').css('background-color') || '#586069';

      const starsText = $repo.find('a[href$="/stargazers"]').text().trim().replace(',', '');
      const stars = parseInt(starsText) || 0;

      const forksText = $repo.find('a[href$="/forks"]').text().trim().replace(',', '');
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

    return repos;
  } catch (error) {
    console.error('Error scraping GitHub:', error);
    throw error;
  }
}

app.get('/api/trending', async (req, res) => {
  try {
    const { language = '', since = 'daily' } = req.query;
    const repos = await scrapeTrending(language, since);
    res.json(repos);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Failed to fetch trending repositories' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Backend server running at http://localhost:${PORT}`);
});
