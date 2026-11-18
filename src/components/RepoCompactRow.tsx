import { useEffect, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import type { Repository, TimeRange } from '../types';
import type { Translations } from '../i18n/translations';
import { findLanguageColor } from '../constants/languages';
import { copyText, formatCompactNumber, formatExactNumber } from '../utils/format';
import RepoAvatar from './RepoAvatar';
import {
  BookOpenIcon,
  BookmarkIcon,
  CheckIcon,
  ChevronUpIcon,
  CopyIcon,
  ForkIcon,
  StarIcon,
  TrendUpIcon,
} from './Icons';

interface RepoCompactRowProps {
  repo: Repository;
  rank: number;
  timeRange: TimeRange;
  isSaved: boolean;
  isExpanded: boolean;
  t: Translations;
  onToggleSave: (repo: Repository) => void;
  onSelectLanguage: (lang: string) => void;
  onToggleExpand: (repo: Repository) => void;
}

export default function RepoCompactRow({
  repo,
  rank,
  timeRange,
  isSaved,
  isExpanded,
  t,
  onToggleSave,
  onSelectLanguage,
  onToggleExpand,
}: RepoCompactRowProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleCopyClone = async () => {
    const ok = await copyText(`git clone https://github.com/${repo.author}/${repo.name}.git`);
    if (ok) {
      setCopied(true);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setCopied(false), 1800);
    }
  };

  const handleRowClick = (event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest('a, button')) return;
    const selection = window.getSelection()?.toString();
    if (selection && selection.length > 0) return;
    onToggleExpand(repo);
  };

  const rankTierClass = rank <= 3 ? `rank-tier-${rank}` : '';
  const langColor = repo.languageColor || findLanguageColor(repo.language);
  const langSlug = repo.language.trim().toLowerCase();

  return (
    <article
      className={`compact-row ${isExpanded ? 'is-expanded' : ''}`}
      onClick={handleRowClick}
    >
      <div className="compact-main">
        <span className={`rank-badge compact-rank ${rankTierClass}`}>
          {String(rank).padStart(2, '0')}
        </span>

        <RepoAvatar src={repo.avatar} alt={repo.author} className="compact-avatar" size={30} />

        <div className="compact-text">
          <div className="compact-title-line">
            <h2 className="compact-title">
              <a href={repo.url} target="_blank" rel="noopener noreferrer" className="repo-link">
                <span className="repo-author">{repo.author}</span>
                <span className="repo-slash">/</span>
                <span className="repo-name">{repo.name}</span>
              </a>
            </h2>

            {repo.language && (
              <button
                type="button"
                className="metric-lang-btn compact-lang"
                onClick={() => onSelectLanguage(langSlug)}
                title={t.filterByLanguage(repo.language)}
              >
                <span
                  className="lang-dot"
                  style={{ backgroundColor: langColor }}
                  aria-hidden="true"
                />
                <span>{repo.language}</span>
              </button>
            )}
          </div>

          <p className={`compact-desc ${!repo.description ? 'is-empty' : ''}`}>
            {repo.description || t.noDescription}
          </p>
        </div>
      </div>

      <div className="compact-stats">
        {repo.builtBy && repo.builtBy.length > 0 && (
          <div className="contributors-stack compact-contributors">
            {repo.builtBy.slice(0, 4).map((contributor) => (
              <a
                key={`${contributor.username}-${contributor.href}`}
                href={contributor.href}
                target="_blank"
                rel="noopener noreferrer"
                className="contributor-link"
                title={`@${contributor.username}`}
                aria-label={`@${contributor.username}`}
              >
                <RepoAvatar
                  src={contributor.avatar}
                  alt={contributor.username}
                  className="contributor-avatar"
                  size={22}
                />
              </a>
            ))}
          </div>
        )}

        <span className="metric-item compact-metric" title={`${formatExactNumber(repo.stars)} stars`}>
          <StarIcon />
          <span>{formatCompactNumber(repo.stars)}</span>
        </span>

        <span className="metric-item compact-metric" title={`${formatExactNumber(repo.forks)} forks`}>
          <ForkIcon />
          <span>{formatCompactNumber(repo.forks)}</span>
        </span>

        {repo.currentPeriodStars > 0 && (
          <span className="metric-velocity compact-velocity">
            <TrendUpIcon />
            <span>
              {t.periodStarsLabel(formatCompactNumber(repo.currentPeriodStars), timeRange)}
            </span>
          </span>
        )}

        <div className="compact-actions">
          <button
            type="button"
            className={`icon-action-btn readme-icon-btn ${isExpanded ? 'is-active' : ''}`}
            onClick={() => onToggleExpand(repo)}
            aria-expanded={isExpanded}
            title={isExpanded ? t.collapseReadme : t.previewReadme}
            aria-label={isExpanded ? t.collapseReadme : t.previewReadme}
          >
            {isExpanded ? <ChevronUpIcon /> : <BookOpenIcon />}
          </button>

          <button
            type="button"
            className={`icon-action-btn ${copied ? 'is-copied' : ''}`}
            onClick={handleCopyClone}
            title={copied ? t.copiedClone : t.copyClone}
            aria-label={copied ? t.copiedClone : t.copyClone}
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </button>

          <button
            type="button"
            className={`icon-action-btn ${isSaved ? 'is-saved' : ''}`}
            onClick={() => onToggleSave(repo)}
            aria-pressed={isSaved}
            title={isSaved ? t.bookmarkRemove : t.bookmarkAdd}
            aria-label={isSaved ? t.bookmarkRemove : t.bookmarkAdd}
          >
            <BookmarkIcon filled={isSaved} />
          </button>
        </div>
      </div>
    </article>
  );
}
