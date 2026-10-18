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
  builtBy: Array<{
    username: string;
    href: string;
    avatar: string;
  }>;
}

export type TimeRange = 'daily' | 'weekly' | 'monthly';
export type Language = 'all' | string;
