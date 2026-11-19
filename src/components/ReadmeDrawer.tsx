import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import type { Repository } from '../types';
import type { Translations } from '../i18n/translations';
import { fetchRepoReadme, getCachedReadme, type ReadmeResult } from '../api/readme';
import {
  getCachedTranslatedReadme,
  translateReadmeHtml,
  type TranslatedReadmeResult,
} from '../api/translate';
import { renderReadmeHtml } from '../utils/markdown';
import { copyText } from '../utils/format';
import RepoAvatar from './RepoAvatar';
import {
  AlertIcon,
  BookOpenIcon,
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  MaximizeIcon,
  MinimizeIcon,
  RefreshIcon,
  TranslateIcon,
  XIcon,
} from './Icons';

interface ReadmeDrawerProps {
  repo: Repository;
  isOpen: boolean;
  variant: 'grid' | 'compact';
  t: Translations;
  onClose: () => void;
}

interface ReadmeDrawerInnerProps {
  repo: Repository;
  isOpen: boolean;
  variant: 'grid' | 'compact';
  t: Translations;
  onClose: () => void;
}

function ReadmeDrawerInner({
  repo,
  isOpen,
  variant,
  t,
  onClose,
}: ReadmeDrawerInnerProps) {
  const cached = getCachedReadme(repo.author, repo.name);
  const cachedTranslation = getCachedTranslatedReadme(repo.author, repo.name);

  const [readme, setReadme] = useState<ReadmeResult | null>(cached);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [fullHeight, setFullHeight] = useState(false);
  const [copied, setCopied] = useState(false);

  const [translation, setTranslation] = useState<TranslatedReadmeResult | null>(cachedTranslation);
  const [viewLang, setViewLang] = useState<'original' | 'zh'>('original');
  const [translating, setTranslating] = useState(false);
  const [translateProgress, setTranslateProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [translateError, setTranslateError] = useState(false);
  const [showChineseNotice, setShowChineseNotice] = useState(false);

  const bodyRef = useRef<HTMLDivElement>(null);
  const copyTimerRef = useRef<number | null>(null);
  const translateAbortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
      translateAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      translateAbortRef.current?.abort();
    }
  }, [isOpen]);

  useEffect(() => {
    const controller = new AbortController();

    fetchRepoReadme(repo.author, repo.name, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setReadme(result);
        setError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'README_NOT_FOUND');
        setLoading(false);
      });

    return () => controller.abort();
  }, [repo.author, repo.name, reloadNonce]);

  const renderedHtml = useMemo(() => {
    if (!readme) return '';
    return renderReadmeHtml(readme.content, {
      author: repo.author,
      name: repo.name,
      branch: readme.branch,
      baseDir: readme.baseDir,
    });
  }, [readme, repo.author, repo.name]);

  const displayedHtml =
    viewLang === 'zh' && translation && !translation.alreadyChinese
      ? translation.html
      : renderedHtml;

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    setReloadNonce((n) => n + 1);
  };

  const handleCopyClone = async () => {
    const ok = await copyText(`git clone https://github.com/${repo.author}/${repo.name}.git`);
    if (ok) {
      setCopied(true);
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopied(false), 1800);
    }
  };

  const handleToggleTranslate = async () => {
    if (translating) {
      translateAbortRef.current?.abort();
      return;
    }

    if (viewLang === 'zh') {
      setViewLang('original');
      setTranslateError(false);
      return;
    }

    if (!renderedHtml) return;

    const existing = translation ?? getCachedTranslatedReadme(repo.author, repo.name);
    if (existing) {
      setTranslation(existing);
      setTranslateError(false);
      if (existing.alreadyChinese) {
        setShowChineseNotice((prev) => !prev);
      } else {
        setViewLang('zh');
      }
      return;
    }

    const controller = new AbortController();
    translateAbortRef.current = controller;
    setTranslating(true);
    setTranslateError(false);
    setTranslateProgress(null);
    setShowChineseNotice(false);

    try {
      const result = await translateReadmeHtml(repo.author, repo.name, renderedHtml, {
        signal: controller.signal,
        onProgress: (done, total) => {
          if (mountedRef.current && !controller.signal.aborted) {
            setTranslateProgress({ done, total });
          }
        },
      });

      if (!mountedRef.current || controller.signal.aborted) return;

      setTranslation(result);
      if (result.alreadyChinese) {
        setShowChineseNotice(true);
        setViewLang('original');
      } else {
        setViewLang('zh');
      }
    } catch (err: unknown) {
      if (!mountedRef.current || controller.signal.aborted) return;
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setTranslateError(true);
    } finally {
      if (translateAbortRef.current === controller) {
        translateAbortRef.current = null;
      }
      if (mountedRef.current) {
        setTranslating(false);
        setTranslateProgress(null);
      }
    }
  };

  const handleMarkdownClick = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    const anchor = target?.closest('a');
    if (!anchor) return;
    const href = anchor.getAttribute('href');
    if (!href || !href.startsWith('#')) return;

    event.preventDefault();
    const rawId = decodeURIComponent(href.slice(1)).toLowerCase();
    if (!rawId || !bodyRef.current) return;

    const candidates = bodyRef.current.querySelectorAll<HTMLElement>('[id]');
    for (const el of candidates) {
      const normalized = el.id.toLowerCase();
      if (normalized === rawId || normalized === `user-content-${rawId}`) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        break;
      }
    }
  };

  const translateBtnLabel = translating
    ? t.translateProgress(translateProgress?.done ?? 0, translateProgress?.total ?? 0)
    : viewLang === 'zh'
      ? t.showOriginal
      : t.translateToZh;

  const showBanner =
    !loading &&
    !error &&
    Boolean(readme) &&
    (translating ||
      translateError ||
      (viewLang === 'zh' && Boolean(translation && !translation.alreadyChinese)) ||
      (showChineseNotice && Boolean(translation?.alreadyChinese)));

  return (
    <section
      className={`readme-drawer ${variant === 'compact' ? 'is-compact' : ''}`}
      aria-label={`${repo.author}/${repo.name} README`}
    >
      <div className="readme-drawer-header">
        <div className="readme-drawer-title-group">
          <RepoAvatar src={repo.avatar} alt={repo.author} className="readme-drawer-avatar" size={26} />
          <a
            href={repo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="readme-drawer-repo-link"
          >
            <span className="repo-author">{repo.author}</span>
            <span className="repo-slash">/</span>
            <span className="repo-name">{repo.name}</span>
          </a>
          <span className="readme-file-badge">
            <BookOpenIcon />
            <span>{readme?.fileName || 'README.md'}</span>
          </span>
        </div>

        <div className="readme-drawer-controls">
          <button
            type="button"
            className={`btn btn-sm readme-translate-btn ${viewLang === 'zh' ? 'btn-ghost is-active' : ''} ${translating ? 'is-translating' : ''}`}
            onClick={handleToggleTranslate}
            disabled={!readme || loading || Boolean(error)}
            title={translateBtnLabel}
            aria-label={translateBtnLabel}
            aria-pressed={viewLang === 'zh'}
          >
            <TranslateIcon />
            <span className="readme-btn-label">{translateBtnLabel}</span>
          </button>

          <button
            type="button"
            className={`btn btn-sm ${copied ? 'is-active' : ''}`}
            onClick={handleCopyClone}
            title={copied ? t.copiedClone : t.copyClone}
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
            <span className="readme-btn-label">{copied ? t.copiedClone : 'Clone'}</span>
          </button>

          <button
            type="button"
            className={`btn btn-sm ${fullHeight ? 'btn-ghost is-active' : ''}`}
            onClick={() => setFullHeight((prev) => !prev)}
            title={fullHeight ? t.readmeConstrainHeight : t.readmeExpandFull}
            aria-pressed={fullHeight}
          >
            {fullHeight ? <MinimizeIcon /> : <MaximizeIcon />}
            <span className="readme-btn-label">
              {fullHeight ? t.readmeConstrainHeight : t.readmeExpandFull}
            </span>
          </button>

          <a
            href={readme?.htmlUrl || repo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm readme-external-btn"
            title={t.openOnGithub}
          >
            <ExternalLinkIcon />
            <span className="readme-btn-label">GitHub</span>
          </a>

          <button
            type="button"
            className="icon-action-btn readme-close-btn"
            onClick={onClose}
            title={t.readmeClose}
            aria-label={t.readmeClose}
          >
            <XIcon />
          </button>
        </div>
      </div>

      <div
        ref={bodyRef}
        className={`readme-drawer-body ${fullHeight ? 'is-full-height' : ''}`}
      >
        {loading && (
          <div className="readme-skeleton" aria-busy="true" aria-label={t.readmeLoading}>
            <div className="skeleton-line readme-sk-h1" />
            <div className="skeleton-line readme-sk-p1" />
            <div className="skeleton-line readme-sk-p2" />
            <div className="skeleton-line readme-sk-block" />
            <div className="skeleton-line readme-sk-h2" />
            <div className="skeleton-line readme-sk-p1" />
            <div className="skeleton-line readme-sk-p3" />
            <span className="readme-loading-hint">{t.readmeLoading}</span>
          </div>
        )}

        {!loading && error && (
          <div className="readme-error-state" role="status">
            <AlertIcon className="readme-error-icon" />
            <p className="readme-error-msg">{t.readmeNotFound}</p>
            <div className="readme-error-actions">
              <button type="button" className="btn btn-sm" onClick={handleRetry}>
                <RefreshIcon />
                <span>{t.readmeRetry}</span>
              </button>
              <a
                href={repo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm btn-primary"
              >
                <ExternalLinkIcon />
                <span>{t.openOnGithub}</span>
              </a>
            </div>
          </div>
        )}

        {!loading && !error && readme && (
          <>
            {showBanner && (
              <div
                className={`readme-translate-banner ${
                  translating
                    ? 'is-loading'
                    : translateError
                      ? 'is-error'
                      : viewLang === 'zh'
                        ? 'is-translated'
                        : 'is-info'
                }`}
                role="status"
              >
                <div className="readme-translate-banner-text">
                  {translating ? (
                    <>
                      <RefreshIcon className="spin" />
                      <span>
                        {t.translateProgress(
                          translateProgress?.done ?? 0,
                          translateProgress?.total ?? 0
                        )}
                      </span>
                    </>
                  ) : translateError ? (
                    <>
                      <AlertIcon />
                      <span>{t.translateFailed}</span>
                    </>
                  ) : viewLang === 'zh' ? (
                    <>
                      <TranslateIcon />
                      <span>{t.translatedBanner}</span>
                    </>
                  ) : (
                    <>
                      <BookOpenIcon />
                      <span>{t.alreadyChineseNotice}</span>
                    </>
                  )}
                </div>

                {!translating && translateError && (
                  <button
                    type="button"
                    className="readme-banner-action"
                    onClick={handleToggleTranslate}
                  >
                    {t.retry}
                  </button>
                )}

                {!translating && !translateError && viewLang === 'zh' && (
                  <button
                    type="button"
                    className="readme-banner-action"
                    onClick={() => setViewLang('original')}
                  >
                    {t.showOriginal}
                  </button>
                )}

                {!translating && !translateError && showChineseNotice && translation?.alreadyChinese && (
                  <button
                    type="button"
                    className="readme-banner-dismiss"
                    onClick={() => setShowChineseNotice(false)}
                    aria-label={t.readmeClose}
                    title={t.readmeClose}
                  >
                    <XIcon />
                  </button>
                )}
              </div>
            )}

            <div
              className="readme-markdown"
              onClick={handleMarkdownClick}
              dangerouslySetInnerHTML={{ __html: displayedHtml }}
            />
          </>
        )}
      </div>
    </section>
  );
}

export default function ReadmeDrawer({
  repo,
  isOpen,
  variant,
  t,
  onClose,
}: ReadmeDrawerProps) {
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => {
      shellRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [isOpen, repo.author, repo.name]);

  return (
    <div
      ref={shellRef}
      className={`readme-drawer-shell ${variant === 'compact' ? 'is-compact' : ''} ${isOpen ? 'is-open' : ''}`}
      aria-hidden={!isOpen}
    >
      <div className="readme-drawer-collapse">
        <div className="readme-drawer-collapse-inner">
          <ReadmeDrawerInner
            key={`${repo.author}/${repo.name}`.toLowerCase()}
            repo={repo}
            isOpen={isOpen}
            variant={variant}
            t={t}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
}
