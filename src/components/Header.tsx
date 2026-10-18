interface HeaderProps {
  lastUpdate: Date;
  autoRefresh: boolean;
  onToggleAutoRefresh: () => void;
  onRefresh: () => void;
}

export default function Header({
  lastUpdate,
  autoRefresh,
  onToggleAutoRefresh,
  onRefresh
}: HeaderProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <header className="header">
      <div className="container header-content">
        <div className="header-left">
          <h1>
            <span className="icon">🚀</span>
            GitHub Trending
          </h1>
          <p className="subtitle">实时追踪最热门的开源项目</p>
        </div>

        <div className="header-right">
          <div className="update-info">
            <span className="label">最后更新:</span>
            <span className="time">{formatTime(lastUpdate)}</span>
          </div>

          <button
            className={`toggle-btn ${autoRefresh ? 'active' : ''}`}
            onClick={onToggleAutoRefresh}
            title={autoRefresh ? '关闭自动刷新' : '开启自动刷新'}
          >
            {autoRefresh ? '🔄 自动刷新' : '⏸️ 已暂停'}
          </button>

          <button
            className="refresh-btn"
            onClick={onRefresh}
            title="立即刷新"
          >
            ↻ 刷新
          </button>
        </div>
      </div>
    </header>
  );
}
