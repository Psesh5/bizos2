export type CategoryType = 
  | 'insider'
  | 'institutional'
  | 'analyst'
  | 'regulatory'
  | 'news_pr'
  | 'media_appearance'
  | 'competitor'
  | 'customer'
  | 'short_interest'
  | 'etf';

export type ImpactLevel = 'high' | 'medium' | 'low';
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type TimeFilter = '1h' | '6h' | '24h' | '7d' | '30d';

export interface ExecutiveQuote {
  text: string;
  speaker: string;
  title?: string;
  context?: string;
  mediaType?: string;
  mediaLink?: string;
}

export interface Event {
  id: string;
  ticker: string;
  category: CategoryType;
  title: string;
  summary: string;
  timestamp: string;
  impact: ImpactLevel;
  confidence: ConfidenceLevel;
  source: string;
  sourceUrl: string;
  explanation?: string;
  watchPhrases?: string[];
  quotes?: ExecutiveQuote[];
}

export interface CategoryInfo {
  type: CategoryType;
  label: string;
  description: string;
  color: string;
}