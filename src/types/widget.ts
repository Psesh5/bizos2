export interface BaseWidget {
  id: string;
  type: string;
  title: string;
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  config: Record<string, any>;
  data?: any;
}

export interface WidgetProps<T = any> {
  widget: BaseWidget;
  data?: T;
  loading?: boolean;
  error?: string;
  onUpdate?: (config: Record<string, any>) => void;
  onRemove?: () => void;
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
}

export interface StockPriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

export interface EarningsData {
  symbol: string;
  quarter: string;
  date: string;
  eps: {
    actual: number;
    estimate: number;
  };
  revenue: {
    actual: number;
    estimate: number;
  };
}

export interface ChartData {
  timestamp: string;
  value: number;
  volume?: number;
}

export type WidgetType = 
  | 'stock-price'
  | 'earnings-calendar'
  | 'price-chart'
  | 'financial-metrics'
  | 'news-feed'
  | 'earnings-transcripts'
  | 'price-move-radar'
  | 'intelligence-hub'
  | 'ai-agent-builder'
  | 'abnormal-event-sequencer'
;

export interface WidgetConfig {
  symbol?: string;
  timeframe?: '1D' | '1W' | '1M' | '3M' | '1Y';
  indicators?: string[];
  theme?: 'light' | 'dark';
}