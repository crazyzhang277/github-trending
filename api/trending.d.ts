export interface TrendingQuery {
  language?: string;
  since?: string;
  spoken?: string;
}

export function scrapeTrending(query: TrendingQuery): Promise<unknown[]>;
