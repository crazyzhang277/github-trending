import type { Locale, Theme } from '../types';
import type { Translations } from '../i18n/translations';
import { formatTimeClock } from '../utils/format';
import {
  BrandLogo,
  MoonIcon,
  PauseIcon,
  PlayIcon,
  RefreshIcon,
  SunIcon,
} from './Icons';

interface HeaderProps {
  lastUpdate: Date | null;
  loading: boolean;
  autoRefresh: boolean;
  locale: Locale;
  theme: Theme;
  t: Translations;
  onToggleAutoRefresh: () => void;
  onRefresh: () => void;
  onToggleLocale: () => void;
  onToggleTheme: () => void;
}

export default function Header({
  lastUpdate,
  loading,
  autoRefresh,
  locale,
  theme,
  t,
  onToggleAutoRefresh,
  onRefresh,
  onToggleLocale,
  onToggleTheme,
}: HeaderProps) {
  const statusText = loading && !lastUpdate
    ? t.syncing
    : lastUpdate
      ? `${t.updatedAt} ${formatTimeClock(lastUpdate, locale)}`
      : t.notSynced;

  return (
    <header className="site-header">
      <div className="container header-inner">
        <div className="brand">
          <BrandLogo className="brand-logo" />
          <div className="brand-text">
            <h1>{t.title}</h1>
            <p className="brand-subtitle">{t.subtitle}</p>
          </div>
        </div>

        <div className="header-actions">
          <div className="sync-status" aria-live="polite">
            <span
              className={`sync-dot ${loading ? 'syncing' : autoRefresh ? 'live' : 'paused'}`}
            />
            <span className="sync-text">{statusText}</span>
          </div>

          <button
            id="toggle-auto-refresh"
            type="button"
            className={`btn btn-ghost ${autoRefresh ? 'is-active' : ''}`}
            onClick={onToggleAutoRefresh}
            aria-pressed={autoRefresh}
            title={autoRefresh ? t.autoRefreshOn : t.autoRefreshOff}
          >
            {autoRefresh ? <PauseIcon /> : <PlayIcon />}
            <span className="btn-label-hide-sm">
              {autoRefresh ? t.autoRefreshOn : t.autoRefreshOff}
            </span>
          </button>

          <button
            id="refresh-trending"
            type="button"
            className="btn btn-primary"
            onClick={onRefresh}
            disabled={loading}
            title={t.refreshNow}
          >
            <RefreshIcon className={loading ? 'spin' : ''} />
            <span>{loading ? t.refreshing : t.refreshNow}</span>
          </button>

          <div className="header-divider" aria-hidden="true" />

          <button
            id="toggle-locale"
            type="button"
            className="btn btn-icon-text"
            onClick={onToggleLocale}
            title={locale === 'zh' ? 'Switch to English' : '切换为中文'}
          >
            {locale === 'zh' ? 'EN' : '中文'}
          </button>

          <button
            id="toggle-theme"
            type="button"
            className="btn btn-icon"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? t.themeToLight : t.themeToDark}
            title={theme === 'dark' ? t.themeToLight : t.themeToDark}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </div>
    </header>
  );
}
