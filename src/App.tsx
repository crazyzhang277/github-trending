import { useState, useEffect, useCallback } from 'react';
import { fetchTrending, POPULAR_LANGUAGES } from './api/trending';
import type { Repository, TimeRange, Language } from './types';
import RepoCard from './components/RepoCard';
import Header from './components/Header';
import Filters from './components/Filters';
import './App.css';

function App() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>('all');
  const [timeRange, setTimeRange] = useState<TimeRange>('daily');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadTrending = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchTrending(language, timeRange);
      setRepos(data);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [language, timeRange]);

  useEffect(() => {
    loadTrending();
  }, [loadTrending]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadTrending();
    }, 5 * 60 * 1000); // 5分钟自动刷新

    return () => clearInterval(interval);
  }, [autoRefresh, loadTrending]);

  return (
    <div className="app">
      <Header
        lastUpdate={lastUpdate}
        autoRefresh={autoRefresh}
        onToggleAutoRefresh={() => setAutoRefresh(!autoRefresh)}
        onRefresh={loadTrending}
      />

      <main className="container">
        <Filters
          language={language}
          timeRange={timeRange}
          languages={POPULAR_LANGUAGES}
          onLanguageChange={setLanguage}
          onTimeRangeChange={setTimeRange}
        />

        {loading && repos.length === 0 && (
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading trending repositories...</p>
          </div>
        )}

        {error && (
          <div className="error">
            <p>❌ {error}</p>
            <button onClick={loadTrending}>Retry</button>
          </div>
        )}

        {!loading && repos.length === 0 && !error && (
          <div className="empty">
            <p>No trending repositories found</p>
          </div>
        )}

        <div className="repos-grid">
          {repos.map((repo, index) => (
            <RepoCard key={`${repo.author}-${repo.name}`} repo={repo} rank={index + 1} />
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;
