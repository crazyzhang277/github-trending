import type { Repository, TimeRange, Language } from '../types';

// 使用 GitHub 官方 Search API
const GITHUB_API = 'https://api.github.com/search/repositories';

// 语言颜色映射
const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  Java: '#b07219',
  Go: '#00ADD8',
  Rust: '#dea584',
  'C++': '#f34b7d',
  C: '#555555',
  PHP: '#4F5D95',
  Ruby: '#701516',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Dart: '#00B4AB',
  Vue: '#41b883',
  HTML: '#e34c26',
  CSS: '#563d7c',
};

function getDateRange(since: TimeRange): string {
  const now = new Date();
  const date = new Date();

  switch (since) {
    case 'daily':
      date.setDate(now.getDate() - 1);
      break;
    case 'weekly':
      date.setDate(now.getDate() - 7);
      break;
    case 'monthly':
      date.setMonth(now.getMonth() - 1);
      break;
  }

  return date.toISOString().split('T')[0];
}

export async function fetchTrending(
  language: Language = 'all',
  since: TimeRange = 'daily'
): Promise<Repository[]> {
  try {
    const date = getDateRange(since);

    // 构建搜索查询
    let query = `created:>${date} stars:>10`;
    if (language !== 'all') {
      query += ` language:${language}`;
    }

    const params = new URLSearchParams({
      q: query,
      sort: 'stars',
      order: 'desc',
      per_page: '30'
    });

    const url = `${GITHUB_API}?${params.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // 转换为我们的 Repository 格式
    const repos: Repository[] = data.items.map((item: any) => ({
      author: item.owner.login,
      name: item.name,
      avatar: item.owner.avatar_url,
      url: item.html_url,
      description: item.description || '',
      language: item.language || '',
      languageColor: LANGUAGE_COLORS[item.language] || '#586069',
      stars: item.stargazers_count,
      forks: item.forks_count,
      currentPeriodStars: item.stargazers_count,
      builtBy: []
    }));

    return repos;
  } catch (error) {
    console.error('Failed to fetch trending repositories:', error);
    throw error;
  }
}

export const POPULAR_LANGUAGES = [
  'all',
  'javascript',
  'typescript',
  'python',
  'java',
  'go',
  'rust',
  'c++',
  'c',
  'php',
  'ruby',
  'swift',
  'kotlin',
  'dart',
  'vue',
  'react',
];
