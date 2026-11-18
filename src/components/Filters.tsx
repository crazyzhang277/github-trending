import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type {
  Language,
  Locale,
  SortBy,
  SpokenLanguage,
  TimeRange,
  ViewMode,
} from '../types';
import type { Translations } from '../i18n/translations';
import { SPOKEN_LANGUAGES, TRENDING_LANGUAGES } from '../constants/languages';
import {
  BookmarkIcon,
  CheckIcon,
  ChevronDownIcon,
  GlobeIcon,
  GridIcon,
  ListIcon,
  SearchIcon,
  XIcon,
} from './Icons';

interface FiltersProps {
  language: Language;
  timeRange: TimeRange;
  spoken: SpokenLanguage;
  searchQuery: string;
  sortBy: SortBy;
  viewMode: ViewMode;
  onlySaved: boolean;
  savedCount: number;
  locale: Locale;
  t: Translations;
  searchInputRef: RefObject<HTMLInputElement | null>;
  onLanguageChange: (lang: Language) => void;
  onTimeRangeChange: (range: TimeRange) => void;
  onSpokenChange: (spoken: SpokenLanguage) => void;
  onSearchChange: (q: string) => void;
  onSortChange: (sort: SortBy) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onToggleOnlySaved: () => void;
}

export default function Filters({
  language,
  timeRange,
  spoken,
  searchQuery,
  sortBy,
  viewMode,
  onlySaved,
  savedCount,
  locale,
  t,
  searchInputRef,
  onLanguageChange,
  onTimeRangeChange,
  onSpokenChange,
  onSearchChange,
  onSortChange,
  onViewModeChange,
  onToggleOnlySaved,
}: FiltersProps) {
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [langFilterText, setLangFilterText] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);
  const langSearchRef = useRef<HTMLInputElement>(null);

  const featuredLanguages = useMemo(
    () => TRENDING_LANGUAGES.filter((item) => item.featured),
    []
  );

  const activeLanguageObj = useMemo(
    () => TRENDING_LANGUAGES.find((item) => item.slug === language),
    [language]
  );

  const isNonFeaturedActive = Boolean(activeLanguageObj && !activeLanguageObj.featured);

  const filteredPopoverLanguages = useMemo(() => {
    const q = langFilterText.trim().toLowerCase();
    if (!q) return TRENDING_LANGUAGES;
    return TRENDING_LANGUAGES.filter(
      (item) =>
        item.label.toLowerCase().includes(q) || item.slug.toLowerCase().includes(q)
    );
  }, [langFilterText]);

  useEffect(() => {
    if (!langMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setLangMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setLangMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    const focusTimer = window.setTimeout(() => langSearchRef.current?.focus(), 20);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.clearTimeout(focusTimer);
    };
  }, [langMenuOpen]);

  const timeRanges: Array<{ value: TimeRange; label: string }> = [
    { value: 'daily', label: t.timeRangeDaily },
    { value: 'weekly', label: t.timeRangeWeekly },
    { value: 'monthly', label: t.timeRangeMonthly },
  ];

  return (
    <section className="control-deck" aria-label="Filters and view controls">
      <div className="control-row-primary">
        <div className="segmented-control" role="group" aria-label="Time range">
          {timeRanges.map((item) => (
            <button
              key={item.value}
              id={`range-${item.value}`}
              type="button"
              className={`segment-btn ${timeRange === item.value ? 'is-active' : ''}`}
              aria-pressed={timeRange === item.value}
              onClick={() => onTimeRangeChange(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="search-field">
          <SearchIcon className="search-field-icon" />
          <input
            ref={searchInputRef}
            id="repo-search"
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t.searchPlaceholder}
            aria-label={t.searchPlaceholder}
          />
          {searchQuery ? (
            <button
              id="clear-search"
              type="button"
              className="search-clear-btn"
              onClick={() => onSearchChange('')}
              aria-label={t.clearSearch}
              title={t.clearSearch}
            >
              <XIcon />
            </button>
          ) : (
            <kbd className="kbd-hint" aria-hidden="true">
              /
            </kbd>
          )}
        </div>

        <div className="control-utilities">
          <div className="select-pill">
            <GlobeIcon className="select-pill-icon" />
            <select
              id="spoken-language"
              value={spoken}
              onChange={(e) => onSpokenChange(e.target.value as SpokenLanguage)}
              aria-label={t.spokenLabel}
              title={t.spokenLabel}
            >
              {SPOKEN_LANGUAGES.map((item) => (
                <option key={item.code} value={item.code}>
                  {locale === 'zh' ? item.labelZh : item.labelEn}
                </option>
              ))}
            </select>
          </div>

          <div className="select-pill">
            <span className="select-prefix">{t.sortLabel}:</span>
            <select
              id="sort-by"
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortBy)}
              aria-label={t.sortLabel}
            >
              <option value="trending">{t.sortTrending}</option>
              <option value="periodStars">{t.sortPeriodStars}</option>
              <option value="stars">{t.sortStars}</option>
              <option value="forks">{t.sortForks}</option>
            </select>
          </div>

          <button
            id="filter-saved"
            type="button"
            className={`chip-toggle ${onlySaved ? 'is-active' : ''}`}
            aria-pressed={onlySaved}
            onClick={onToggleOnlySaved}
          >
            <BookmarkIcon filled={onlySaved} />
            <span>{t.savedFilter}</span>
            {savedCount > 0 && <span className="count-pill">{savedCount}</span>}
          </button>

          <div className="view-switch" role="group" aria-label="View mode">
            <button
              id="view-grid"
              type="button"
              className={`view-switch-btn ${viewMode === 'grid' ? 'is-active' : ''}`}
              aria-pressed={viewMode === 'grid'}
              onClick={() => onViewModeChange('grid')}
              title={t.viewGrid}
              aria-label={t.viewGrid}
            >
              <GridIcon />
            </button>
            <button
              id="view-compact"
              type="button"
              className={`view-switch-btn ${viewMode === 'compact' ? 'is-active' : ''}`}
              aria-pressed={viewMode === 'compact'}
              onClick={() => onViewModeChange('compact')}
              title={t.viewCompact}
              aria-label={t.viewCompact}
            >
              <ListIcon />
            </button>
          </div>
        </div>
      </div>

      <div className="control-row-languages">
        <div className="language-chips" role="group" aria-label="Programming language">
          {featuredLanguages.map((lang) => {
            const isActive = language === lang.slug;
            return (
              <button
                key={lang.slug}
                id={`lang-${lang.slug}`}
                type="button"
                className={`lang-chip ${isActive ? 'is-active' : ''}`}
                aria-pressed={isActive}
                onClick={() => onLanguageChange(lang.slug)}
              >
                {lang.slug !== 'all' && (
                  <span
                    className="lang-dot"
                    style={{ backgroundColor: lang.color }}
                    aria-hidden="true"
                  />
                )}
                <span>{lang.slug === 'all' ? t.allLanguages : lang.label}</span>
              </button>
            );
          })}

          {isNonFeaturedActive && activeLanguageObj && (
            <button
              type="button"
              className="lang-chip is-active"
              aria-pressed="true"
              onClick={() => onLanguageChange('all')}
              title={t.resetFilters}
            >
              <span
                className="lang-dot"
                style={{ backgroundColor: activeLanguageObj.color }}
                aria-hidden="true"
              />
              <span>{activeLanguageObj.label}</span>
              <XIcon className="lang-chip-remove" />
            </button>
          )}

          <div className="lang-popover-anchor" ref={popoverRef}>
            <button
              id="more-languages-btn"
              type="button"
              className={`lang-chip lang-chip-more ${langMenuOpen ? 'is-open' : ''}`}
              aria-expanded={langMenuOpen}
              onClick={() => {
                setLangFilterText('');
                setLangMenuOpen((prev) => !prev);
              }}
            >
              <span>{t.moreLanguages}</span>
              <ChevronDownIcon />
            </button>

            {langMenuOpen && (
              <div className="lang-popover" role="dialog" aria-label={t.moreLanguages}>
                <div className="lang-popover-search">
                  <SearchIcon />
                  <input
                    ref={langSearchRef}
                    id="language-popover-search"
                    type="text"
                    value={langFilterText}
                    onChange={(e) => setLangFilterText(e.target.value)}
                    placeholder={t.searchLanguagesPlaceholder}
                  />
                </div>
                <div className="lang-popover-list" role="listbox">
                  {filteredPopoverLanguages.length === 0 ? (
                    <div className="lang-popover-empty">{t.noLanguageMatches}</div>
                  ) : (
                    filteredPopoverLanguages.map((lang) => {
                      const selected = language === lang.slug;
                      return (
                        <button
                          key={lang.slug}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          className={`lang-popover-item ${selected ? 'is-selected' : ''}`}
                          onClick={() => {
                            onLanguageChange(lang.slug);
                            setLangMenuOpen(false);
                          }}
                        >
                          <span className="lang-popover-item-left">
                            <span
                              className="lang-dot"
                              style={{ backgroundColor: lang.color }}
                              aria-hidden="true"
                            />
                            <span>
                              {lang.slug === 'all' ? t.allLanguages : lang.label}
                            </span>
                          </span>
                          {selected && <CheckIcon className="lang-selected-icon" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
