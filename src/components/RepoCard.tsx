import type { Repository } from '../types';

interface RepoCardProps {
  repo: Repository;
  rank: number;
}

export default function RepoCard({ repo, rank }: RepoCardProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  return (
    <article className="repo-card">
      <div className="rank-badge">#{rank}</div>

      <div className="repo-header">
        <img src={repo.avatar} alt={repo.author} className="avatar" />
        <div className="repo-info">
          <h3>
            <a href={repo.url} target="_blank" rel="noopener noreferrer">
              <span className="author">{repo.author}</span>
              <span className="separator">/</span>
              <span className="name">{repo.name}</span>
            </a>
          </h3>
        </div>
      </div>

      <p className="description">{repo.description || '暂无描述'}</p>

      <div className="repo-stats">
        {repo.language && (
          <div className="stat language">
            <span
              className="language-color"
              style={{ backgroundColor: repo.languageColor }}
            ></span>
            <span>{repo.language}</span>
          </div>
        )}

        <div className="stat">
          <span className="icon">⭐</span>
          <span>{formatNumber(repo.stars)}</span>
        </div>

        <div className="stat">
          <span className="icon">🍴</span>
          <span>{formatNumber(repo.forks)}</span>
        </div>

        {repo.currentPeriodStars > 0 && (
          <div className="stat trending">
            <span className="icon">🔥</span>
            <span>{formatNumber(repo.currentPeriodStars)} stars today</span>
          </div>
        )}
      </div>

      {repo.builtBy && repo.builtBy.length > 0 && (
        <div className="built-by">
          <span className="label">Built by:</span>
          <div className="contributors">
            {repo.builtBy.slice(0, 5).map((contributor) => (
              <a
                key={contributor.username}
                href={contributor.href}
                target="_blank"
                rel="noopener noreferrer"
                title={contributor.username}
              >
                <img src={contributor.avatar} alt={contributor.username} />
              </a>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
