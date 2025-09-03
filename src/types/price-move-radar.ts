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
export type TimeFilter = '1d' | '1w' | '1m' | '3m' | '6m' | '1y' | '3y' | '5y';

export interface ExecutiveQuote {
  text: string;
  speaker: string;
  title?: string;
  context?: string;
  mediaType?: string;
  mediaLink?: string;
}

export interface PriceMoveEvent {
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
  priceImpact?: number; // Actual % price change
}

export interface CategoryInfo {
  type: CategoryType;
  label: string;
  description: string;
  color: string;
}

export const CATEGORY_INFO: Record<CategoryType, CategoryInfo> = {
  insider: {
    type: 'insider',
    label: 'Insider Trading',
    description: 'Executive and insider stock transactions',
    color: 'hsl(var(--category-insider))'
  },
  institutional: {
    type: 'institutional',
    label: 'Institutional',
    description: 'Large institutional investor activity',
    color: 'hsl(var(--category-institutional))'
  },
  analyst: {
    type: 'analyst',
    label: 'Analyst',
    description: 'Analyst ratings and price targets',
    color: 'hsl(var(--category-analyst))'
  },
  regulatory: {
    type: 'regulatory',
    label: 'Regulatory',
    description: 'Regulatory approvals and compliance',
    color: 'hsl(var(--category-regulatory))'
  },
  news_pr: {
    type: 'news_pr',
    label: 'News & PR',
    description: 'Press releases and news announcements',
    color: 'hsl(var(--category-news-pr))'
  },
  media_appearance: {
    type: 'media_appearance',
    label: 'Media Appearance',
    description: 'Executive interviews and appearances',
    color: 'hsl(var(--category-media-appearance))'
  },
  competitor: {
    type: 'competitor',
    label: 'Competitor',
    description: 'Competitor actions and developments',
    color: 'hsl(var(--category-competitor))'
  },
  customer: {
    type: 'customer',
    label: 'Customer',
    description: 'Customer partnerships and deals',
    color: 'hsl(var(--category-customer))'
  },
  short_interest: {
    type: 'short_interest',
    label: 'Short Interest',
    description: 'Short selling activity and interest',
    color: 'hsl(var(--category-short-interest))'
  },
  etf: {
    type: 'etf',
    label: 'ETF',
    description: 'ETF inflows and holdings changes',
    color: 'hsl(var(--category-etf))'
  }
};