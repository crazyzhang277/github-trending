import type { TimeRange, Language } from '../types';

interface FiltersProps {
  language: Language;
  timeRange: TimeRange;
  languages: string[];
  onLanguageChange: (lang: Language) => void;
  onTimeRangeChange: (range: TimeRange) => void;
}

export default function Filters({
  language,
  timeRange,
  languages,
  onLanguageChange,
  onTimeRangeChange,
}: FiltersProps) {
  return (
    <div className="filters">
      <div className="filter-group">
        <label htmlFor="language">语言:</label>
        <select
          id="language"
          value={language}
          onChange={(e) => onLanguageChange(e.target.value as Language)}
        >
          {languages.map((lang) => (
            <option key={lang} value={lang}>
              {lang === 'all' ? '全部语言' : lang}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="timeRange">时间范围:</label>
        <select
          id="timeRange"
          value={timeRange}
          onChange={(e) => onTimeRangeChange(e.target.value as TimeRange)}
        >
          <option value="daily">今日</option>
          <option value="weekly">本周</option>
          <option value="monthly">本月</option>
        </select>
      </div>
    </div>
  );
}
