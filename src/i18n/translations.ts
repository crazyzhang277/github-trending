import type { Locale, TimeRange } from '../types';

export interface Translations {
  title: string;
  subtitle: string;
  syncing: string;
  notSynced: string;
  updatedAt: string;
  autoRefreshOn: string;
  autoRefreshOff: string;
  refreshNow: string;
  refreshing: string;
  themeToLight: string;
  themeToDark: string;
  allLanguages: string;
  moreLanguages: string;
  searchLanguagesPlaceholder: string;
  noLanguageMatches: string;
  spokenLabel: string;
  timeRangeDaily: string;
  timeRangeWeekly: string;
  timeRangeMonthly: string;
  searchPlaceholder: string;
  clearSearch: string;
  sortLabel: string;
  sortTrending: string;
  sortPeriodStars: string;
  sortStars: string;
  sortForks: string;
  viewGrid: string;
  viewCompact: string;
  savedFilter: string;
  reposCount: (shown: number, total: number) => string;
  savedCount: (count: number) => string;
  totalPeriodGain: (formatted: string, range: TimeRange) => string;
  periodStarsLabel: (formatted: string, range: TimeRange) => string;
  noDescription: string;
  builtBy: string;
  copyClone: string;
  copiedClone: string;
  bookmarkAdd: string;
  bookmarkRemove: string;
  openOnGithub: string;
  filterByLanguage: (lang: string) => string;
  previewReadme: string;
  collapseReadme: string;
  readmeLoading: string;
  readmeNotFound: string;
  readmeRetry: string;
  readmeExpandFull: string;
  readmeConstrainHeight: string;
  readmeClose: string;
  errorTitle: string;
  retry: string;
  emptyTrendingTitle: string;
  emptyTrendingDesc: string;
  emptySearchTitle: string;
  emptySearchDesc: string;
  emptySavedTitle: string;
  emptySavedDesc: string;
  resetFilters: string;
  footerSource: string;
  footerShortcut: string;
}

const zh: Translations = {
  title: 'GitHub Trending',
  subtitle: '实时开源趋势雷达',
  syncing: '同步中...',
  notSynced: '等待同步',
  updatedAt: '更新于',
  autoRefreshOn: '自动刷新 · 5m',
  autoRefreshOff: '自动刷新已暂停',
  refreshNow: '立即刷新',
  refreshing: '刷新中...',
  themeToLight: '切换为浅色主题',
  themeToDark: '切换为深色主题',
  allLanguages: '全部语言',
  moreLanguages: '更多语言',
  searchLanguagesPlaceholder: '搜索编程语言...',
  noLanguageMatches: '未找到匹配的语言',
  spokenLabel: '文档语言',
  timeRangeDaily: '今日',
  timeRangeWeekly: '本周',
  timeRangeMonthly: '本月',
  searchPlaceholder: '筛选仓库名、作者或描述...',
  clearSearch: '清除搜索',
  sortLabel: '排序',
  sortTrending: '趋势热度',
  sortPeriodStars: '本期新增 Star',
  sortStars: '总 Star 数',
  sortForks: 'Fork 数',
  viewGrid: '卡片视图',
  viewCompact: '榜单视图',
  savedFilter: '已收藏',
  reposCount: (shown, total) =>
    shown === total ? `共 ${total} 个热门项目` : `已筛选 ${shown} / ${total} 个项目`,
  savedCount: (count) => `已收藏 ${count} 个项目`,
  totalPeriodGain: (formatted, range) => {
    const unit = range === 'daily' ? '今日' : range === 'weekly' ? '本周' : '本月';
    return `${unit}累计 +${formatted} ★`;
  },
  periodStarsLabel: (formatted, range) => {
    const unit = range === 'daily' ? '今日' : range === 'weekly' ? '本周' : '本月';
    return `+${formatted} ${unit}`;
  },
  noDescription: '该项目暂未填写简介',
  builtBy: '贡献者',
  copyClone: '复制 clone 命令',
  copiedClone: '已复制',
  bookmarkAdd: '收藏项目',
  bookmarkRemove: '取消收藏',
  openOnGithub: '前往 GitHub',
  filterByLanguage: (lang) => `按 ${lang} 筛选`,
  previewReadme: '预览 README',
  collapseReadme: '收起',
  readmeLoading: '正在加载 README 文档...',
  readmeNotFound: '该仓库暂未提供 README，或当前暂时无法拉取内容。',
  readmeRetry: '重新加载',
  readmeExpandFull: '展开全高',
  readmeConstrainHeight: '固定高度',
  readmeClose: '关闭预览',
  errorTitle: '数据加载失败',
  retry: '重试连接',
  emptyTrendingTitle: '暂无趋势项目',
  emptyTrendingDesc: 'GitHub Trending 当前筛选条件下暂无上榜仓库，可尝试切换其他语言或时间范围。',
  emptySearchTitle: '没有匹配的项目',
  emptySearchDesc: '当前搜索关键词未匹配到任何项目，请尝试更换关键词或清除筛选条件。',
  emptySavedTitle: '暂无收藏项目',
  emptySavedDesc: '点击仓库卡片右上角的星标收藏按钮，即可将感兴趣的项目保存在本地。',
  resetFilters: '重置筛选',
  footerSource: '数据实时抓取自 GitHub Trending',
  footerShortcut: '快捷键：/ 搜索 · R 刷新',
};

const en: Translations = {
  title: 'GitHub Trending',
  subtitle: 'Real-time Open Source Radar',
  syncing: 'Syncing...',
  notSynced: 'Not synced',
  updatedAt: 'Updated',
  autoRefreshOn: 'Auto · 5m',
  autoRefreshOff: 'Auto paused',
  refreshNow: 'Refresh',
  refreshing: 'Refreshing...',
  themeToLight: 'Switch to light theme',
  themeToDark: 'Switch to dark theme',
  allLanguages: 'All',
  moreLanguages: 'More',
  searchLanguagesPlaceholder: 'Search language...',
  noLanguageMatches: 'No matching language',
  spokenLabel: 'Spoken',
  timeRangeDaily: 'Today',
  timeRangeWeekly: 'This Week',
  timeRangeMonthly: 'This Month',
  searchPlaceholder: 'Filter by repo, author, or description...',
  clearSearch: 'Clear search',
  sortLabel: 'Sort',
  sortTrending: 'Trending Rank',
  sortPeriodStars: 'Period Stars',
  sortStars: 'Total Stars',
  sortForks: 'Total Forks',
  viewGrid: 'Card Grid',
  viewCompact: 'Compact List',
  savedFilter: 'Saved',
  reposCount: (shown, total) =>
    shown === total ? `${total} trending repositories` : `${shown} of ${total} repositories`,
  savedCount: (count) => `${count} saved repositories`,
  totalPeriodGain: (formatted, range) => {
    const unit = range === 'daily' ? 'today' : range === 'weekly' ? 'this week' : 'this month';
    return `+${formatted} ★ ${unit}`;
  },
  periodStarsLabel: (formatted, range) => {
    const unit = range === 'daily' ? 'today' : range === 'weekly' ? 'this week' : 'this month';
    return `+${formatted} ${unit}`;
  },
  noDescription: 'No description provided',
  builtBy: 'Built by',
  copyClone: 'Copy git clone command',
  copiedClone: 'Copied',
  bookmarkAdd: 'Bookmark repository',
  bookmarkRemove: 'Remove bookmark',
  openOnGithub: 'Open on GitHub',
  filterByLanguage: (lang) => `Filter by ${lang}`,
  previewReadme: 'README',
  collapseReadme: 'Collapse',
  readmeLoading: 'Loading README...',
  readmeNotFound: 'No README found for this repository, or it could not be loaded right now.',
  readmeRetry: 'Reload',
  readmeExpandFull: 'Full height',
  readmeConstrainHeight: 'Fixed height',
  readmeClose: 'Close preview',
  errorTitle: 'Unable to load trending feed',
  retry: 'Try Again',
  emptyTrendingTitle: 'No trending repositories',
  emptyTrendingDesc:
    'GitHub Trending returned no repositories for this combination. Try another language or time window.',
  emptySearchTitle: 'No matching repositories',
  emptySearchDesc: 'No repositories match your current search query.',
  emptySavedTitle: 'No saved repositories yet',
  emptySavedDesc: 'Click the bookmark icon on any repository to save it locally for quick access.',
  resetFilters: 'Reset Filters',
  footerSource: 'Live data sourced from GitHub Trending',
  footerShortcut: 'Shortcuts: / to search · R to refresh',
};

export const TRANSLATIONS: Record<Locale, Translations> = { zh, en };
