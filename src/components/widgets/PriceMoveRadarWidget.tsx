import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, ExternalLink, TrendingUp, TrendingDown, Minus, Quote, Filter, Search } from 'lucide-react';
import { WidgetProps } from '@/types/widget';
import { PriceMoveEvent, CategoryType, TimeFilter, ConfidenceLevel, CATEGORY_INFO } from '@/types/price-move-radar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { priceMoveRadarAPI } from '@/services/price-move-radar-api';

interface PriceMoveRadarWidgetProps extends WidgetProps {
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
}

// Mock events for now - will be replaced with real API calls
const generateMockEvents = (symbol: string): PriceMoveEvent[] => [
  {
    id: '1',
    ticker: symbol,
    category: 'insider',
    title: `CEO Sells 223,986 Shares of ${symbol}`,
    summary: `${symbol} CEO disposed of shares worth approximately $41.5M in pre-planned transaction`,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    impact: 'medium',
    confidence: 'high',
    source: 'SEC Form 4',
    sourceUrl: '#',
    explanation: 'Routine insider selling by CEOs is typically planned months in advance and may not indicate negative sentiment.',
    priceImpact: -1.2
  },
  {
    id: '2',
    ticker: symbol,
    category: 'analyst',
    title: `Goldman Sachs Upgrades ${symbol} to Buy`,
    summary: `Analyst cites strong fundamentals and improved operational efficiency`,
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    impact: 'high',
    confidence: 'high',
    source: 'Goldman Sachs Research',
    sourceUrl: '#',
    explanation: 'Analyst upgrades from major investment banks often trigger institutional buying.',
    priceImpact: 4.3
  },
  {
    id: '3',
    ticker: symbol,
    category: 'news_pr',
    title: `${symbol} Announces Strategic Partnership`,
    summary: `Company signs major deal to expand market presence and accelerate growth`,
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    impact: 'high',
    confidence: 'medium',
    source: 'BusinessWire',
    sourceUrl: '#',
    explanation: 'Strategic partnerships can unlock new revenue streams and validate market positioning.',
    priceImpact: 2.8
  },
  {
    id: '4',
    ticker: symbol,
    category: 'institutional',
    title: `BlackRock Increases ${symbol} Position by 15%`,
    summary: `Major institutional investor adds $890M to existing position`,
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    impact: 'medium',
    confidence: 'high',
    source: '13F Filing',
    sourceUrl: '#',
    explanation: 'Large institutional buying often signals confidence in long-term prospects.',
    priceImpact: 1.5
  },
  {
    id: '5',
    ticker: symbol,
    category: 'media_appearance',
    title: `${symbol} CEO on CNBC: "Strong Growth Ahead"`,
    summary: `CEO discusses Q4 outlook and strategic initiatives in live interview`,
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    impact: 'medium',
    confidence: 'high',
    source: 'CNBC Squawk Box',
    sourceUrl: '#',
    explanation: 'Executive commentary can significantly influence investor sentiment.',
    priceImpact: 0.8,
    quotes: [
      {
        text: "We're seeing tremendous momentum across all our key markets. I'm very optimistic about our growth trajectory.",
        speaker: 'CEO',
        title: `Chief Executive Officer, ${symbol}`,
        context: 'Discussing Q4 outlook',
        mediaType: 'TV',
        mediaLink: '#'
      }
    ]
  }
];

export const PriceMoveRadarWidget = ({ widget, isExpanded = false, onToggleExpanded }: PriceMoveRadarWidgetProps) => {
  const [selectedTicker, setSelectedTicker] = useState<string>('');
  const [selectedCategories, setSelectedCategories] = useState<CategoryType[]>([]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('1m');
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceLevel[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<PriceMoveEvent | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [minPriceImpact, setMinPriceImpact] = useState<string>('');

  const symbol = widget.config?.symbol || 'AAPL';
  
  // Determine which symbol to fetch data for - prioritize selectedTicker or use widget symbol
  const activeSymbol = selectedTicker || symbol;
  
  // Fetch real events from API
  const { data: apiEvents = [], isLoading, error } = useQuery({
    queryKey: ['price-move-events', activeSymbol, timeFilter],
    queryFn: () => {
      console.log('🔥 useQuery called with:', { activeSymbol, timeFilter });
      return priceMoveRadarAPI.getAllEvents(activeSymbol, timeFilter);
    },
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
  });
  
  console.log('📊 Widget state:', { apiEvents: apiEvents.length, isLoading, error, timeFilter });
  
  // Smart fallback: Use real data when available, supplement with mock when needed
  const mockEvents = generateMockEvents(activeSymbol);
  
  let allEvents: PriceMoveEvent[];
  if (apiEvents.length > 0) {
    // Use real data and supplement with mock if we have less than 5 events
    allEvents = apiEvents.length < 5 
      ? [...apiEvents, ...mockEvents.slice(0, 5 - apiEvents.length)]
      : apiEvents;
  } else {
    // No real data available, use mock data
    allEvents = mockEvents;
  }

  const filteredEvents = useMemo(() => {
    return allEvents.filter(event => {
      // If a specific ticker is selected, only show events for that ticker
      if (selectedTicker && event.ticker !== selectedTicker) return false;
      
      // If search query is present, search in title, summary, and ticker
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = event.title.toLowerCase().includes(query) ||
                            event.summary.toLowerCase().includes(query) ||
                            event.ticker.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      } else {
        // If no search query and no specific ticker selected, show events for the active symbol
        if (!selectedTicker && event.ticker !== activeSymbol) return false;
      }
      
      // Filter by categories
      if (selectedCategories.length > 0 && !selectedCategories.includes(event.category)) return false;
      
      // Filter by confidence
      if (confidenceFilter.length > 0 && !confidenceFilter.includes(event.confidence)) return false;
      
      // Filter by minimum price impact
      if (minPriceImpact && event.priceImpact !== undefined) {
        const minImpact = parseFloat(minPriceImpact);
        if (!isNaN(minImpact) && Math.abs(event.priceImpact) < minImpact) return false;
      }
      
      return true;
    });
  }, [allEvents, activeSymbol, selectedTicker, selectedCategories, confidenceFilter, searchQuery, minPriceImpact]);

  const getImpactIcon = (impact: PriceMoveEvent['impact']) => {
    switch (impact) {
      case 'high':
        return <TrendingUp className="h-4 w-4 text-impact-high" />;
      case 'medium':
        return <Minus className="h-4 w-4 text-impact-medium" />;
      case 'low':
        return <TrendingDown className="h-4 w-4 text-impact-low" />;
    }
  };

  const getCategoryColor = (category: CategoryType) => {
    return CATEGORY_INFO[category]?.color || 'hsl(var(--muted))';
  };

  const getConfidenceColor = (confidence: ConfidenceLevel) => {
    return `hsl(var(--confidence-${confidence}))`;
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(timestamp).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffHours >= 24) {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } else if (diffHours >= 1) {
      return `${diffHours}h ago`;
    } else {
      return `${diffMinutes}m ago`;
    }
  };

  const timeOptions = [
    { value: '1d' as TimeFilter, label: '1D' },
    { value: '1w' as TimeFilter, label: '1W' },
    { value: '1m' as TimeFilter, label: '1M' },
    { value: '3m' as TimeFilter, label: '3M' },
    { value: '6m' as TimeFilter, label: '6M' },
    { value: '1y' as TimeFilter, label: '1Y' },
    { value: '3y' as TimeFilter, label: '3Y' },
    { value: '5y' as TimeFilter, label: '5Y' },
  ];

  const confidenceOptions = [
    { value: 'high' as ConfidenceLevel, label: 'High', color: 'hsl(var(--confidence-high))' },
    { value: 'medium' as ConfidenceLevel, label: 'Medium', color: 'hsl(var(--confidence-medium))' },
    { value: 'low' as ConfidenceLevel, label: 'Low', color: 'hsl(var(--confidence-low))' },
  ];

  const toggleCategory = (category: CategoryType) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(prev => prev.filter(c => c !== category));
    } else {
      setSelectedCategories(prev => [...prev, category]);
    }
  };

  const toggleConfidence = (confidence: ConfidenceLevel) => {
    if (confidenceFilter.includes(confidence)) {
      setConfidenceFilter(prev => prev.filter(c => c !== confidence));
    } else {
      setConfidenceFilter(prev => [...prev, confidence]);
    }
  };

  // Small Widget View (Mobile-like)
  if (!isExpanded) {
    return (
      <div 
        className="space-y-3 cursor-pointer" 
        onDoubleClick={onToggleExpanded}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Price Movers ({filteredEvents.length})
          </h3>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <div className={`w-1.5 h-1.5 rounded-full ${
              isLoading ? 'bg-yellow-500 animate-pulse' 
              : error ? 'bg-red-500' 
              : 'bg-green-500 animate-pulse'
            }`} />
            {isLoading ? 'Loading...' : error ? 'Error' : 'Live'}
          </div>
        </div>

        {/* Stock Ticker Input */}
        <div>
          <Input
            placeholder={`Search ticker (current: ${activeSymbol})`}
            value={selectedTicker}
            onChange={(e) => setSelectedTicker(e.target.value.toUpperCase())}
            className="h-8 text-xs font-mono text-center"
          />
        </div>

        {/* Category Legend (Compact) */}
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Categories</h4>
          <div className="grid grid-cols-2 gap-1">
            {Object.entries(CATEGORY_INFO).slice(0, 6).map(([key, category]) => {
              const isSelected = selectedCategories.includes(category.type);
              return (
                <button
                  key={key}
                  onClick={() => toggleCategory(category.type)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-all ${
                    isSelected 
                      ? 'bg-primary/10 border border-primary' 
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <div 
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="truncate">{category.label}</span>
                </button>
              );
            })}
          </div>
          {Object.keys(CATEGORY_INFO).length > 6 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onToggleExpanded}
              className="w-full mt-1 h-6 text-xs text-muted-foreground"
            >
              +{Object.keys(CATEGORY_INFO).length - 6} more
            </Button>
          )}
        </div>

        {/* Time Range Buttons */}
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Time Range</h4>
          <div className="grid grid-cols-3 gap-1">
            {timeOptions.map((option) => (
              <Button
                key={option.value}
                variant={timeFilter === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeFilter(option.value)}
                className={`text-xs font-mono h-6 ${
                  timeFilter === option.value 
                    ? 'bg-primary text-primary-foreground' 
                    : 'hover:bg-primary/10'
                }`}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Confidence Legend */}
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Confidence</h4>
          <div className="flex gap-1">
            {confidenceOptions.map((option) => {
              const isSelected = confidenceFilter.includes(option.value);
              return (
                <button
                  key={option.value}
                  onClick={() => toggleConfidence(option.value)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-all flex-1 justify-center ${
                    isSelected 
                      ? 'bg-primary/10 border border-primary' 
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: option.color }}
                  />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Price Impact Filter */}
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Min Price Impact</h4>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const current = parseFloat(minPriceImpact) || 0;
                setMinPriceImpact(Math.max(0, current - 0.5).toString());
              }}
              className="h-5 w-5 p-0 text-xs"
            >
              -
            </Button>
            <div className="relative flex-1">
              <span className="absolute left-1.5 top-0.5 text-xs text-muted-foreground">&gt;</span>
              <Input
                placeholder="2.5"
                value={minPriceImpact}
                onChange={(e) => setMinPriceImpact(e.target.value.replace(/[^0-9.]/g, ''))}
                className="h-5 text-xs text-center pl-5 pr-4 font-mono"
              />
              <span className="absolute right-1.5 top-0.5 text-xs text-muted-foreground">%</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const current = parseFloat(minPriceImpact) || 0;
                setMinPriceImpact((current + 0.5).toString());
              }}
              className="h-5 w-5 p-0 text-xs"
            >
              +
            </Button>
          </div>
        </div>

        {/* Market Events */}
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Market Events</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {filteredEvents.slice(0, 4).map((event) => (
              <Card
                key={event.id}
                className="p-2 hover:shadow-sm transition-all cursor-pointer border-border"
                onClick={() => setSelectedEvent(event)}
              >
                <div className="flex items-start gap-2">
                  <div 
                    className="w-0.5 h-8 rounded-full flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: getCategoryColor(event.category) }}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-1">
                      <Badge variant="outline" className="text-xs px-1 py-0 h-4">
                        {event.ticker}
                      </Badge>
                      <span 
                        className="text-xs px-1 py-0 rounded text-white font-medium"
                        style={{ backgroundColor: getCategoryColor(event.category) }}
                      >
                        {CATEGORY_INFO[event.category]?.label}
                      </span>
                    </div>
                    
                    <h4 className="text-xs font-medium text-foreground line-clamp-1 mb-1">
                      {event.title}
                    </h4>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{getTimeAgo(event.timestamp)}</span>
                      <div className="flex items-center gap-1">
                        {getImpactIcon(event.impact)}
                        {event.priceImpact && (
                          <span className={event.priceImpact >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {event.priceImpact >= 0 ? '+' : ''}{event.priceImpact.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {filteredEvents.length > 4 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onToggleExpanded}
              className="w-full h-6 text-xs mt-2"
            >
              View All {filteredEvents.length} Events
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Large Widget View (Full Desktop)
  return (
    <div className="space-y-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          Price-Move Radar
        </h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className={`w-2 h-2 rounded-full ${
            isLoading ? 'bg-yellow-500 animate-pulse' 
            : error ? 'bg-red-500' 
            : 'bg-green-500 animate-pulse'
          }`} />
          {isLoading ? 'Loading events...' : error ? 'API Error' : 'Live updates'}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search events or ticker..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="p-4">
            <h3 className="font-medium mb-3">Categories</h3>
            <div className="space-y-2">
              {Object.values(CATEGORY_INFO).map((category) => (
                <Button
                  key={category.type}
                  variant={selectedCategories.includes(category.type) ? "default" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setSelectedCategories(prev => 
                      prev.includes(category.type)
                        ? prev.filter(c => c !== category.type)
                        : [...prev, category.type]
                    );
                  }}
                  className="w-full justify-start text-xs"
                >
                  <div 
                    className="w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: category.color }}
                  />
                  {category.label}
                </Button>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-medium mb-3">Filters</h3>
            <div className="space-y-4">
              {/* Time Range */}
              <div>
                <h4 className="text-sm font-medium mb-2">Time Range</h4>
                <div className="grid grid-cols-3 gap-1">
                  {timeOptions.map((option) => (
                    <Button
                      key={option.value}
                      variant={timeFilter === option.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTimeFilter(option.value)}
                      className="text-xs font-mono h-8"
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Confidence Filter */}
              <div>
                <h4 className="text-sm font-medium mb-2">Confidence</h4>
                <div className="space-y-1">
                  {confidenceOptions.map((option) => {
                    const isSelected = confidenceFilter.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        onClick={() => toggleConfidence(option.value)}
                        className={`w-full flex items-center gap-2 p-2 rounded text-xs transition-all ${
                          isSelected 
                            ? 'bg-primary/10 border border-primary' 
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: option.color }}
                        />
                        <span>{option.label}</span>
                        {isSelected && <span className="ml-auto text-primary">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Price Impact Filter */}
              <div>
                <h4 className="text-sm font-medium mb-2">Min Price Impact</h4>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const current = parseFloat(minPriceImpact) || 0;
                      setMinPriceImpact(Math.max(0, current - 0.5).toString());
                    }}
                    className="h-7 w-7 p-0 text-sm"
                  >
                    -
                  </Button>
                  <div className="relative flex-1">
                    <span className="absolute left-2 top-1.5 text-sm text-muted-foreground">&gt;</span>
                    <Input
                      placeholder="2.5"
                      value={minPriceImpact}
                      onChange={(e) => setMinPriceImpact(e.target.value.replace(/[^0-9.]/g, ''))}
                      className="h-7 text-sm text-center pl-6 pr-6 font-mono"
                    />
                    <span className="absolute right-2 top-1.5 text-sm text-muted-foreground">%</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const current = parseFloat(minPriceImpact) || 0;
                      setMinPriceImpact((current + 0.5).toString());
                    }}
                    className="h-7 w-7 p-0 text-sm"
                  >
                    +
                  </Button>
                </div>
                {minPriceImpact && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Showing events with ≥{minPriceImpact}% price impact
                  </p>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Event Feed */}
        <div className="lg:col-span-2 min-h-0">
          <Card className="p-4 h-full">
            <div className="space-y-3 h-full overflow-auto">
              {filteredEvents.map((event) => (
                <Card
                  key={event.id}
                  className={`cursor-pointer transition-all hover:shadow-md p-4 ${
                    selectedEvent?.id === event.id 
                      ? 'border-primary shadow-md' 
                      : 'border-border hover:border-border/60'
                  }`}
                  onClick={() => setSelectedEvent(event)}
                >
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-1 h-full min-h-[60px] rounded-full flex-shrink-0"
                      style={{ backgroundColor: getCategoryColor(event.category) }}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            {event.ticker}
                          </Badge>
                          <span 
                            className="text-xs px-2 py-1 rounded-full text-white font-medium"
                            style={{ backgroundColor: getCategoryColor(event.category) }}
                          >
                            {CATEGORY_INFO[event.category]?.label}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {getImpactIcon(event.impact)}
                          <div 
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: getConfidenceColor(event.confidence) }}
                            title={`${event.confidence} confidence`}
                          />
                        </div>
                      </div>

                      <h3 className="font-semibold text-foreground mb-2 line-clamp-2">
                        {event.title}
                      </h3>

                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {event.summary}
                      </p>

                      {event.quotes && event.quotes.length > 0 && (
                        <div className="mb-3 p-2 bg-muted/30 rounded border-l-2 border-primary/30">
                          <div className="flex items-start gap-2">
                            <Quote className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-foreground italic line-clamp-2">
                                "{event.quotes[0].text}"
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                — {event.quotes[0].speaker}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {getTimeAgo(event.timestamp)}
                          </div>
                          <div className="flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" />
                            {event.source}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span>
                            {event.confidence} confidence • {event.impact} impact
                          </span>
                          {event.priceImpact && (
                            <span className={event.priceImpact >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                              {event.priceImpact >= 0 ? '+' : ''}{event.priceImpact.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </div>

        {/* Event Detail */}
        <div className="lg:col-span-1">
          {selectedEvent ? (
            <Card className="p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{selectedEvent.ticker}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedEvent(null)}
                  >
                    ×
                  </Button>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">{selectedEvent.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {selectedEvent.summary}
                  </p>
                  
                  {selectedEvent.explanation && (
                    <div className="p-3 bg-muted/30 rounded">
                      <p className="text-xs text-muted-foreground">
                        <strong>Analysis:</strong> {selectedEvent.explanation}
                      </p>
                    </div>
                  )}
                </div>

                {selectedEvent.quotes && selectedEvent.quotes.map((quote, idx) => (
                  <div key={idx} className="p-3 border-l-2 border-primary/30 bg-muted/20 rounded">
                    <Quote className="h-4 w-4 text-primary mb-2" />
                    <p className="text-sm italic mb-2">"{quote.text}"</p>
                    <p className="text-xs text-muted-foreground">
                      — {quote.speaker}
                      {quote.title && `, ${quote.title}`}
                    </p>
                  </div>
                ))}

                <div className="pt-3 border-t space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Source:</span>
                    <span>{selectedEvent.source}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Impact:</span>
                    <span className="capitalize">{selectedEvent.impact}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Confidence:</span>
                    <span className="capitalize">{selectedEvent.confidence}</span>
                  </div>
                  {selectedEvent.priceImpact && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Price Impact:</span>
                      <span className={selectedEvent.priceImpact >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                        {selectedEvent.priceImpact >= 0 ? '+' : ''}{selectedEvent.priceImpact.toFixed(2)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-4 flex items-center justify-center h-32">
              <p className="text-sm text-muted-foreground">
                Select an event to view details
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};