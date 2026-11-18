export interface Contributor {
  username: string;
  href: string;
  avatar: string;
}

export interface Repository {
  author: string;
  name: string;
  avatar: string;
  url: string;
  description: string;
  language: string;
  languageColor: string;
  stars: number;
  forks: number;
  currentPeriodStars: number;
  builtBy: Contributor[];
}

export type TimeRange = 'daily' | 'weekly' | 'monthly';
export type Language = 'all' | string;
export type SpokenLanguage = 'all' | string;
export type SortBy = 'trending' | 'periodStars' | 'stars' | 'forks';
export type ViewMode = 'grid' | 'compact';
export type Locale = 'zh' | 'en';
export type Theme = 'dark' | 'light';
