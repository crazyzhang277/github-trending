export interface LanguageOption {
  slug: string;
  label: string;
  color: string;
  featured?: boolean;
}

export interface SpokenLanguageOption {
  code: string;
  labelZh: string;
  labelEn: string;
}

export const TRENDING_LANGUAGES: LanguageOption[] = [
  { slug: 'all', label: 'All Languages', color: '#10b981', featured: true },
  { slug: 'python', label: 'Python', color: '#3572A5', featured: true },
  { slug: 'typescript', label: 'TypeScript', color: '#3178c6', featured: true },
  { slug: 'javascript', label: 'JavaScript', color: '#f1e05a', featured: true },
  { slug: 'go', label: 'Go', color: '#00ADD8', featured: true },
  { slug: 'rust', label: 'Rust', color: '#dea584', featured: true },
  { slug: 'c++', label: 'C++', color: '#f34b7d', featured: true },
  { slug: 'java', label: 'Java', color: '#b07219', featured: true },
  { slug: 'c#', label: 'C#', color: '#178600', featured: true },
  { slug: 'shell', label: 'Shell', color: '#89e051', featured: true },
  { slug: 'vue', label: 'Vue', color: '#41b883', featured: true },
  { slug: 'c', label: 'C', color: '#555555' },
  { slug: 'swift', label: 'Swift', color: '#F05138' },
  { slug: 'kotlin', label: 'Kotlin', color: '#A97BFF' },
  { slug: 'dart', label: 'Dart', color: '#00B4AB' },
  { slug: 'php', label: 'PHP', color: '#4F5D95' },
  { slug: 'ruby', label: 'Ruby', color: '#701516' },
  { slug: 'html', label: 'HTML', color: '#e34c26' },
  { slug: 'css', label: 'CSS', color: '#563d7c' },
  { slug: 'svelte', label: 'Svelte', color: '#ff3e00' },
  { slug: 'astro', label: 'Astro', color: '#ff5a03' },
  { slug: 'jupyter-notebook', label: 'Jupyter Notebook', color: '#DA5B0B' },
  { slug: 'zig', label: 'Zig', color: '#ec915c' },
  { slug: 'lua', label: 'Lua', color: '#000080' },
  { slug: 'scala', label: 'Scala', color: '#c22d40' },
  { slug: 'elixir', label: 'Elixir', color: '#6e4a7e' },
  { slug: 'haskell', label: 'Haskell', color: '#5e5086' },
  { slug: 'dockerfile', label: 'Dockerfile', color: '#384d54' },
  { slug: 'objective-c', label: 'Objective-C', color: '#438eff' },
];

export const SPOKEN_LANGUAGES: SpokenLanguageOption[] = [
  { code: 'all', labelZh: '全部自然语言', labelEn: 'Any Language' },
  { code: 'zh', labelZh: '中文', labelEn: 'Chinese' },
  { code: 'en', labelZh: 'English', labelEn: 'English' },
  { code: 'ja', labelZh: '日本語', labelEn: 'Japanese' },
  { code: 'ko', labelZh: '한국어', labelEn: 'Korean' },
  { code: 'de', labelZh: 'Deutsch', labelEn: 'German' },
  { code: 'fr', labelZh: 'Français', labelEn: 'French' },
  { code: 'es', labelZh: 'Español', labelEn: 'Spanish' },
  { code: 'ru', labelZh: 'Русский', labelEn: 'Russian' },
];

export function findLanguageColor(name: string, fallback = '#64748b'): string {
  const normalized = name.trim().toLowerCase();
  const match = TRENDING_LANGUAGES.find(
    (item) => item.slug === normalized || item.label.toLowerCase() === normalized
  );
  return match?.color || fallback;
}
