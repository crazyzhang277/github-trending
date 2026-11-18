import type { ViewMode } from '../types';

interface SkeletonGridProps {
  viewMode: ViewMode;
  count?: number;
}

export default function SkeletonGrid({ viewMode, count = 9 }: SkeletonGridProps) {
  const items = Array.from({ length: count }, (_, idx) => idx);

  if (viewMode === 'compact') {
    return (
      <div className="compact-list" aria-busy="true" aria-label="Loading repositories">
        {items.map((idx) => (
          <div key={idx} className="compact-row skeleton-row">
            <div className="skeleton-line sk-rank" />
            <div className="skeleton-circle sk-avatar-sm" />
            <div className="skeleton-col-grow">
              <div className="skeleton-line sk-title" />
              <div className="skeleton-line sk-desc-sm" />
            </div>
            <div className="skeleton-line sk-badge" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="repos-grid" aria-busy="true" aria-label="Loading repositories">
      {items.map((idx) => (
        <div key={idx} className="repo-card skeleton-card">
          <div className="skeleton-card-head">
            <div className="skeleton-circle sk-avatar" />
            <div className="skeleton-col-grow">
              <div className="skeleton-line sk-title" />
            </div>
            <div className="skeleton-line sk-rank" />
          </div>
          <div className="skeleton-line sk-desc-1" />
          <div className="skeleton-line sk-desc-2" />
          <div className="skeleton-card-metrics">
            <div className="skeleton-line sk-pill" />
            <div className="skeleton-line sk-pill" />
            <div className="skeleton-line sk-badge" />
          </div>
        </div>
      ))}
    </div>
  );
}
