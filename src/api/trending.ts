import type { Language, Repository, SpokenLanguage, TimeRange } from '../types';
import { findLanguageColor } from '../constants/languages';

export interface FetchTrendingParams {
  language?: Language;
  since?: TimeRange;
  spoken?: SpokenLanguage;
  signal?: AbortSignal;
  forceRefresh?: boolean;
}

export function toStaticLanguageKey(language: string): string {
  const normalized = (language || 'all').trim().toLowerCase();
  if (!normalized || normalized === 'all') return 'all';
  if (normalized === 'c++') return 'cpp';
  if (normalized === 'c#') return 'csharp';
  return normalized.replace(/[^a-z0-9-]/g, '-');
}

function getSearchDateCutoff(since: TimeRange): string {
  const date = new Date();
  if (since === 'daily') {
    date.setDate(date.getDate() - 1);
  } else if (since === 'weekly') {
    date.setDate(date.getDate() - 7);
  } else {
    date.setMonth(date.getMonth() - 1);
  }
  return date.toISOString().split('T')[0];
}

function mapLanguageForGitHubSearch(language: string): string {
  const norm = language.trim().toLowerCase();
  if (norm === 'c++') return '"C++"';
  if (norm === 'c#') return '"C#"';
  if (norm === 'jupyter-notebook') return '"Jupyter Notebook"';
  if (norm === 'objective-c') return '"Objective-C"';
  return language;
}

async function fetchFromStaticSnapshot(
  language: Language,
  since: TimeRange,
  signal?: AbortSignal
): Promise<Repository[] | null> {
  const base = import.meta.env.BASE_URL || '/';
  const key = toStaticLanguageKey(language);
  const url = `${base}data/trending/${key}_${since}.json`;

  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return null;
    const data: unknown = await res.json();
    return Array.isArray(data) ? (data as Repository[]) : null;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    return null;
  }
}

interface GitHubSearchRepo {
  name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  owner: {
    login: string;
    avatar_url: string;
  };
}

async function fetchFromGitHubSearchApi(
  language: Language,
  since: TimeRange,
  signal?: AbortSignal
): Promise<Repository[]> {
  const cutoff = getSearchDateCutoff(since);
  let q = `created:>${cutoff} stars:>10`;
  if (language && language !== 'all') {
    q += ` language:${mapLanguageForGitHubSearch(language)}`;
  }

  const params = new URLSearchParams({
    q,
    sort: 'stars',
    order: 'desc',
    per_page: '25',
  });

  const res = await fetch(`https://api.github.com/search/repositories?${params.toString()}`, {
    signal,
    headers: {
      Accept: 'application/vnd.github+json',
    },
  });

  if (!res.ok) {
    throw new Error(`GitHub API error (HTTP ${res.status})`);
  }

  const payload = (await res.json()) as { items?: GitHubSearchRepo[] };
  const items = Array.isArray(payload.items) ? payload.items : [];

  return items.map((item) => {
    const lang = item.language || '';
    return {
      author: item.owner.login,
      name: item.name,
      avatar: `${item.owner.avatar_url}${item.owner.avatar_url.includes('?') ? '&' : '?'}size=80`,
      url: item.html_url,
      description: item.description || '',
      language: lang,
      languageColor: lang ? findLanguageColor(lang) : '',
      stars: item.stargazers_count,
      forks: item.forks_count,
      currentPeriodStars: item.stargazers_count,
      builtBy: [],
    };
  });
}

export async function fetchTrending({
  language = 'all',
  since = 'daily',
  spoken = 'all',
  signal,
  forceRefresh = false,
}: FetchTrendingParams = {}): Promise<Repository[]> {
  const params = new URLSearchParams();
  if (language && language !== 'all') {
    params.set('language', language);
  }
  params.set('since', since);
  if (spoken && spoken !== 'all') {
    params.set('spoken', spoken);
  }
  if (forceRefresh) {
    params.set('refresh', '1');
    params.set('_t', Date.now().toString());
  }

  let shouldFallbackToStatic = false;

  try {
    const response = await fetch(`/api/trending?${params.toString()}`, {
      signal,
      cache: forceRefresh ? 'no-store' : 'default',
    });

    const contentType = response.headers.get('content-type') || '';

    if (response.ok && contentType.includes('application/json')) {
      const data: unknown = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('Unexpected API response format');
      }
      return data as Repository[];
    }

    if (response.status === 404 || response.status === 405 || !contentType.includes('application/json')) {
      shouldFallbackToStatic = true;
    } else {
      let message = `HTTP ${response.status}`;
      try {
        const errBody = (await response.json()) as { error?: string };
        if (errBody?.error) {
          message = errBody.error;
        }
      } catch {
        // Ignore parse failure
      }
      throw new Error(message);
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    if (!shouldFallbackToStatic) {
      throw err;
    }
  }

  // Static hosting fallback (e.g. GitHub Pages where /api/trending does not exist)
  if (spoken === 'all') {
    const snapshot = await fetchFromStaticSnapshot(language, since, signal);
    if (snapshot !== null) {
      return snapshot;
    }
  }

  return fetchFromGitHubSearchApi(language, since, signal);
}
