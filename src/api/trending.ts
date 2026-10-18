import type { Repository, TimeRange, Language } from '../types';

// 使用部署在 Vercel 的后端 API
const TRENDING_API = import.meta.env.PROD
  ? '/api/trending'
  : 'http://localhost:3001/api/trending';

export async function fetchTrending(
  language: Language = 'all',
  since: TimeRange = 'daily'
): Promise<Repository[]> {
  try {
    const params = new URLSearchParams();
    if (language !== 'all') params.append('language', language);
    params.append('since', since);

    const url = `${TRENDING_API}?${params.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
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
