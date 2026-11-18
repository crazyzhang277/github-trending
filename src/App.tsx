import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { fetchTrending } from './api/trending';
import type {
  Language,
  Locale,
  Repository,
  SortBy,
  SpokenLanguage,
  Theme,
  TimeRange,
  ViewMode,
} from './types';
import { TRANSLATIONS } from './i18n/translations';
import { TRENDING_LANGUAGES } from './constants/languages';
import { formatCompactNumber } from './utils/format';
import Header from './components/Header';
import Filters from './components/Filters';
import RepoCard from './components/RepoCard';
import RepoCompactRow from './components/RepoCompactRow';
import ReadmeDrawer from './components/ReadmeDrawer';
import SkeletonGrid from './components/SkeletonGrid';
import { AlertIcon, BookmarkIcon, RefreshIcon, SearchIcon } from './components/Icons';
import './App.css';

const STORAGE_KEYS = {
  theme: 'gt_theme',
  locale: 'gt_locale',
  viewMode: 'gt_view_mode',
  savedRepos: 'gt_saved_repos',
} as const;

const AUTO_REFRESH_MS = 5 * 60 * 1000;

function readInitialUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const rawLang = (params.get('language') || 'all').trim().toLowerCase();
  const rawSince = params.get('since') || 'daily';
  const rawSpoken = (params.get('spoken') || 'all').trim().toLowerCase();
  const rawView = params.get('view');

  const since: TimeRange =
    rawSince === 'weekly' || rawSince === 'monthly' ? rawSince : 'daily';

  const savedView = localStorage.getItem(STORAGE_KEYS.viewMode);
  const viewMode: ViewMode =
    rawView === 'compact' || rawView === 'grid'
      ? rawView
      : savedView === 'compact'
        ? 'compact'
        : 'grid';

  return {
    language: rawLang || 'all',
    timeRange: since,
    spoken: rawSpoken || 'all',
    viewMode,
  };
}

function readInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.theme);
    if (saved === 'light' || saved === 'dark') return saved;
    if (window.matchMedia?.('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
  } catch {
    // Ignore storage errors
  }
  return 'dark';
}

function readInitialLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.locale);
    if (saved === 'en' || saved === 'zh') return saved;
  } catch {
    // Ignore storage errors
  }
  return 'zh';
}

function readInitialSavedRepos(): Repository[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.savedRepos);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Repository[]) : [];
  } catch {
    return [];
  }
}

function repoKey(repo: Pick<Repository, 'author' | 'name'>): string {
  return `${repo.author}/${repo.name}`.toLowerCase();
}

function getGridColumns(): number {
  if (typeof window === 'undefined') return 3;
  if (window.matchMedia('(max-width: 720px)').matches) return 1;
  if (window.matchMedia('(max-width: 1120px)').matches) return 2;
  return 3;
}

function App() {
  const initial = useMemo(() => readInitialUrlParams(), []);

  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFilterTransition, setIsFilterTransition] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>(initial.language);
  const [timeRange, setTimeRange] = useState<TimeRange>(initial.timeRange);
  const [spoken, setSpoken] = useState<SpokenLanguage>(initial.spoken);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('trending');
  const [viewMode, setViewMode] = useState<ViewMode>(initial.viewMode);
  const [onlySaved, setOnlySaved] = useState(false);
  const [savedRepos, setSavedRepos] = useState<Repository[]>(readInitialSavedRepos);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [locale, setLocale] = useState<Locale>(readInitialLocale);
  const [theme, setTheme] = useState<Theme>(readInitialTheme);
  const [fetchNonce, setFetchNonce] = useState(0);
  const [gridColumns, setGridColumns] = useState<number>(getGridColumns);
  const [drawerRepo, setDrawerRepo] = useState<Repository | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const forceRefreshRef = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const openRafRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const t = TRANSLATIONS[locale];

  // Sync theme attribute to <html>
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
    try {
      localStorage.setItem(STORAGE_KEYS.theme, theme);
    } catch {
      // Ignore storage errors
    }
  }, [theme]);

  // Sync locale to <html lang> and storage
  useEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
    try {
      localStorage.setItem(STORAGE_KEYS.locale, locale);
    } catch {
      // Ignore storage errors
    }
  }, [locale]);

  // Persist view mode
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.viewMode, viewMode);
    } catch {
      // Ignore storage errors
    }
  }, [viewMode]);

  // Persist saved bookmarks
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.savedRepos, JSON.stringify(savedRepos));
    } catch {
      // Ignore storage errors
    }
  }, [savedRepos]);

  // Keep URL query string synced with active filters
  useEffect(() => {
    const params = new URLSearchParams();
    if (language !== 'all') params.set('language', language);
    if (timeRange !== 'daily') params.set('since', timeRange);
    if (spoken !== 'all') params.set('spoken', spoken);
    if (viewMode !== 'grid') params.set('view', viewMode);

    const nextQuery = params.toString();
    const nextUrl = nextQuery
      ? `${window.location.pathname}?${nextQuery}`
      : window.location.pathname;
    window.history.replaceState(null, '', nextUrl);
  }, [language, timeRange, spoken, viewMode]);

  // Fetch trending repositories with AbortController race-condition protection
  useEffect(() => {
    const controller = new AbortController();
    const forceRefresh = forceRefreshRef.current;
    forceRefreshRef.current = false;

    fetchTrending({
      language,
      since: timeRange,
      spoken,
      signal: controller.signal,
      forceRefresh,
    })
      .then((data) => {
        if (controller.signal.aborted) return;
        setRepos(data);
        setError(null);
        setLastUpdate(new Date());
        setLoading(false);
        setIsFilterTransition(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Failed to load data');
        setLoading(false);
        setIsFilterTransition(false);
      });

    return () => controller.abort();
  }, [language, timeRange, spoken, fetchNonce]);

  const triggerRefresh = useCallback((force = true, transition = false) => {
    forceRefreshRef.current = force;
    setLoading(true);
    setError(null);
    if (transition) {
      setIsFilterTransition(true);
    }
    setFetchNonce((n) => n + 1);
  }, []);

  // Auto refresh timer (pauses cleanly when tab is hidden)
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        triggerRefresh(true, false);
      }
    }, AUTO_REFRESH_MS);

    return () => window.clearInterval(interval);
  }, [autoRefresh, triggerRefresh]);

  // Track responsive grid column count for row-aligned README drawer insertion
  useEffect(() => {
    const mqSmall = window.matchMedia('(max-width: 720px)');
    const mqMedium = window.matchMedia('(max-width: 1120px)');
    const syncColumns = () => {
      setGridColumns(getGridColumns());
    };
    mqSmall.addEventListener('change', syncColumns);
    mqMedium.addEventListener('change', syncColumns);
    return () => {
      mqSmall.removeEventListener('change', syncColumns);
      mqMedium.removeEventListener('change', syncColumns);
    };
  }, []);

  const clearDrawerTimers = useCallback(() => {
    if (openRafRef.current !== null) {
      window.cancelAnimationFrame(openRafRef.current);
      openRafRef.current = null;
    }
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearDrawerTimers, [clearDrawerTimers]);

  const closeDrawer = useCallback(() => {
    clearDrawerTimers();
    setDrawerOpen(false);
    closeTimerRef.current = window.setTimeout(() => {
      setDrawerRepo(null);
      closeTimerRef.current = null;
    }, 320);
  }, [clearDrawerTimers]);

  // Keyboard shortcuts: '/' to focus search, 'r' to refresh, 'Escape' to close README drawer
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable;

      if (isTyping) return;

      if (event.key === 'Escape' && drawerOpen) {
        event.preventDefault();
        closeDrawer();
      } else if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        searchInputRef.current?.focus();
      } else if (
        (event.key === 'r' || event.key === 'R') &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        event.preventDefault();
        triggerRefresh(true, false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [triggerRefresh, drawerOpen, closeDrawer]);

  const handleLanguageChange = (nextLanguage: Language) => {
    if (nextLanguage === language) return;
    closeDrawer();
    setOnlySaved(false);
    setLoading(true);
    setIsFilterTransition(true);
    setError(null);
    setLanguage(nextLanguage);
  };

  const handleTimeRangeChange = (nextRange: TimeRange) => {
    if (nextRange === timeRange) return;
    closeDrawer();
    setLoading(true);
    setIsFilterTransition(true);
    setError(null);
    setTimeRange(nextRange);
  };

  const handleSpokenChange = (nextSpoken: SpokenLanguage) => {
    if (nextSpoken === spoken) return;
    closeDrawer();
    setLoading(true);
    setIsFilterTransition(true);
    setError(null);
    setSpoken(nextSpoken);
  };

  const handleToggleSave = (repo: Repository) => {
    const key = repoKey(repo);
    setSavedRepos((prev) => {
      const exists = prev.some((item) => repoKey(item) === key);
      if (exists) {
        return prev.filter((item) => repoKey(item) !== key);
      }
      return [repo, ...prev];
    });
  };

  const handleResetFilters = () => {
    closeDrawer();
    setSearchQuery('');
    setSortBy('trending');
    setOnlySaved(false);
    if (language !== 'all' || timeRange !== 'daily' || spoken !== 'all') {
      setLoading(true);
      setIsFilterTransition(true);
      setError(null);
      setLanguage('all');
      setTimeRange('daily');
      setSpoken('all');
    }
  };

  const savedKeys = useMemo(
    () => new Set(savedRepos.map((item) => repoKey(item))),
    [savedRepos]
  );

  // Build ranked list preserving original trending rank when sorting
  const sourceList = useMemo(() => {
    const base = onlySaved ? savedRepos : repos;
    return base.map((repo, idx) => ({ repo, originalRank: idx + 1 }));
  }, [onlySaved, savedRepos, repos]);

  const displayedRepos = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = q
      ? sourceList.filter(({ repo }) => {
          const fullName = `${repo.author}/${repo.name}`.toLowerCase();
          return (
            fullName.includes(q) ||
            repo.description.toLowerCase().includes(q) ||
            repo.language.toLowerCase().includes(q)
          );
        })
      : sourceList;

    if (sortBy === 'trending') {
      return filtered;
    }

    return [...filtered].sort((a, b) => {
      if (sortBy === 'periodStars') {
        return b.repo.currentPeriodStars - a.repo.currentPeriodStars;
      }
      if (sortBy === 'stars') {
        return b.repo.stars - a.repo.stars;
      }
      return b.repo.forks - a.repo.forks;
    });
  }, [sourceList, searchQuery, sortBy]);

  const handleToggleExpand = useCallback(
    (targetRepo: Repository) => {
      const targetKey = repoKey(targetRepo);
      const currentKey = drawerRepo ? repoKey(drawerRepo) : null;

      if (currentKey === targetKey && drawerOpen) {
        closeDrawer();
        return;
      }

      const curIndex =
        currentKey !== null
          ? displayedRepos.findIndex(({ repo }) => repoKey(repo) === currentKey)
          : -1;
      const nextIndex = displayedRepos.findIndex(({ repo }) => repoKey(repo) === targetKey);
      const sameGridRow =
        drawerOpen &&
        viewMode === 'grid' &&
        curIndex >= 0 &&
        nextIndex >= 0 &&
        Math.floor(curIndex / gridColumns) === Math.floor(nextIndex / gridColumns);

      clearDrawerTimers();
      setDrawerRepo(targetRepo);

      if (sameGridRow) {
        setDrawerOpen(true);
        return;
      }

      setDrawerOpen(false);
      openRafRef.current = window.requestAnimationFrame(() => {
        openRafRef.current = window.requestAnimationFrame(() => {
          setDrawerOpen(true);
          openRafRef.current = null;
        });
      });
    },
    [drawerRepo, drawerOpen, displayedRepos, viewMode, gridColumns, clearDrawerTimers, closeDrawer]
  );

  const totalPeriodStars = useMemo(
    () => displayedRepos.reduce((sum, item) => sum + item.repo.currentPeriodStars, 0),
    [displayedRepos]
  );

  const activeLanguageLabel = useMemo(() => {
    if (language === 'all') return t.allLanguages;
    const match = TRENDING_LANGUAGES.find((item) => item.slug === language);
    return match ? match.label : language;
  }, [language, t.allLanguages]);

  const showSkeletons = !onlySaved && loading && (isFilterTransition || repos.length === 0);
  const showError = !onlySaved && Boolean(error) && !loading;
  const showEmpty = !showSkeletons && !showError && displayedRepos.length === 0;

  const drawerKey = drawerRepo ? repoKey(drawerRepo) : null;
  const expandedIndex =
    drawerKey !== null
      ? displayedRepos.findIndex(({ repo }) => repoKey(repo) === drawerKey)
      : -1;
  const gridRowEndIndex =
    expandedIndex >= 0
      ? Math.min(
          displayedRepos.length - 1,
          Math.floor(expandedIndex / gridColumns) * gridColumns + gridColumns - 1
        )
      : -1;

  return (
    <div className="app-shell">
      <Header
        lastUpdate={lastUpdate}
        loading={loading}
        autoRefresh={autoRefresh}
        locale={locale}
        theme={theme}
        t={t}
        onToggleAutoRefresh={() => setAutoRefresh((prev) => !prev)}
        onRefresh={() => triggerRefresh(true, false)}
        onToggleLocale={() => setLocale((prev) => (prev === 'zh' ? 'en' : 'zh'))}
        onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
      />

      <main className="container main-content">
        <Filters
          language={language}
          timeRange={timeRange}
          spoken={spoken}
          searchQuery={searchQuery}
          sortBy={sortBy}
          viewMode={viewMode}
          onlySaved={onlySaved}
          savedCount={savedRepos.length}
          locale={locale}
          t={t}
          searchInputRef={searchInputRef}
          onLanguageChange={handleLanguageChange}
          onTimeRangeChange={handleTimeRangeChange}
          onSpokenChange={handleSpokenChange}
          onSearchChange={setSearchQuery}
          onSortChange={setSortBy}
          onViewModeChange={setViewMode}
          onToggleOnlySaved={() => {
            closeDrawer();
            setOnlySaved((prev) => !prev);
          }}
        />

        {!showSkeletons && !showError && (
          <div className="feed-summary">
            <div className="feed-summary-left">
              <span className="summary-count">
                {onlySaved
                  ? t.savedCount(displayedRepos.length)
                  : t.reposCount(displayedRepos.length, repos.length)}
              </span>
              {!onlySaved && (
                <span className="summary-context">
                  · {activeLanguageLabel} ·{' '}
                  {timeRange === 'daily'
                    ? t.timeRangeDaily
                    : timeRange === 'weekly'
                      ? t.timeRangeWeekly
                      : t.timeRangeMonthly}
                </span>
              )}
            </div>

            {!onlySaved && totalPeriodStars > 0 && (
              <div className="summary-gain">
                {t.totalPeriodGain(formatCompactNumber(totalPeriodStars), timeRange)}
              </div>
            )}
          </div>
        )}

        {showSkeletons && <SkeletonGrid viewMode={viewMode} count={viewMode === 'compact' ? 10 : 9} />}

        {showError && (
          <div className="state-card state-error" role="alert">
            <div className="state-icon state-icon-error">
              <AlertIcon />
            </div>
            <h2>{t.errorTitle}</h2>
            <p className="state-desc">{error}</p>
            <button
              id="retry-fetch"
              type="button"
              className="btn btn-primary"
              onClick={() => triggerRefresh(true, true)}
            >
              <RefreshIcon />
              <span>{t.retry}</span>
            </button>
          </div>
        )}

        {showEmpty && (
          <div className="state-card state-empty">
            <div className="state-icon">
              {onlySaved ? <BookmarkIcon /> : <SearchIcon />}
            </div>
            <h2>
              {onlySaved
                ? t.emptySavedTitle
                : searchQuery.trim()
                  ? t.emptySearchTitle
                  : t.emptyTrendingTitle}
            </h2>
            <p className="state-desc">
              {onlySaved
                ? t.emptySavedDesc
                : searchQuery.trim()
                  ? t.emptySearchDesc
                  : t.emptyTrendingDesc}
            </p>
            {(onlySaved || searchQuery.trim() || language !== 'all' || spoken !== 'all') && (
              <button
                id="reset-filters"
                type="button"
                className="btn btn-ghost"
                onClick={handleResetFilters}
              >
                {t.resetFilters}
              </button>
            )}
          </div>
        )}

        {!showSkeletons && !showError && displayedRepos.length > 0 && (
          viewMode === 'grid' ? (
            <div className="repos-grid">
              {displayedRepos.map(({ repo, originalRank }, index) => {
                const key = repoKey(repo);
                const isExpanded = drawerOpen && drawerKey === key;
                return (
                  <Fragment key={key}>
                    <RepoCard
                      repo={repo}
                      rank={originalRank}
                      timeRange={timeRange}
                      isSaved={savedKeys.has(key)}
                      isExpanded={isExpanded}
                      t={t}
                      onToggleSave={handleToggleSave}
                      onSelectLanguage={handleLanguageChange}
                      onToggleExpand={handleToggleExpand}
                    />
                    {drawerRepo && index === gridRowEndIndex && (
                      <ReadmeDrawer
                        repo={drawerRepo}
                        isOpen={drawerOpen}
                        variant="grid"
                        t={t}
                        onClose={closeDrawer}
                      />
                    )}
                  </Fragment>
                );
              })}
            </div>
          ) : (
            <div className="compact-list">
              {displayedRepos.map(({ repo, originalRank }, index) => {
                const key = repoKey(repo);
                const isExpanded = drawerOpen && drawerKey === key;
                return (
                  <Fragment key={key}>
                    <RepoCompactRow
                      repo={repo}
                      rank={originalRank}
                      timeRange={timeRange}
                      isSaved={savedKeys.has(key)}
                      isExpanded={isExpanded}
                      t={t}
                      onToggleSave={handleToggleSave}
                      onSelectLanguage={handleLanguageChange}
                      onToggleExpand={handleToggleExpand}
                    />
                    {drawerRepo && index === expandedIndex && (
                      <ReadmeDrawer
                        repo={drawerRepo}
                        isOpen={drawerOpen}
                        variant="compact"
                        t={t}
                        onClose={closeDrawer}
                      />
                    )}
                  </Fragment>
                );
              })}
            </div>
          )
        )}
      </main>

      <footer className="site-footer">
        <div className="container footer-inner">
          <span>{t.footerSource}</span>
          <span className="footer-shortcuts">{t.footerShortcut}</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
