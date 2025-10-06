import { Clock, AlertTriangle, TrendingUp, Building, DollarSign, Target, FileText, ExternalLink, Calendar, Filter } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useEffect, useState, useCallback, useMemo } from "react";
import { newsService, ProcessedNewsItem, PressRelease } from "@/services/news-service";

interface NewsItem {
  id: string;
  title: string;
  date: string;
  priority: "high" | "medium" | "low";
  category: "market" | "operational" | "contracts" | "capital" | "press_release";
  classification: "UNCLASSIFIED" | "CONFIDENTIAL" | "SECRET";
  url?: string;
  site?: string;
}

interface NewsBriefingWidgetProps {
  widget: {
    config?: {
      symbol?: string;
    };
  };
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
}


const categoryIcons = {
  market: TrendingUp,
  operational: Target,
  contracts: Building,
  capital: DollarSign,
  press_release: FileText
};

const categoryLabels = {
  market: "MARKET/INVESTOR ACTIVITY",
  operational: "OPERATIONAL MILESTONES", 
  contracts: "CONTRACTS & GOVERNMENT DEALS",
  capital: "CAPITAL ACTIONS",
  press_release: "PRESS RELEASES"
};

const priorityColors = {
  high: "priority-high",
  medium: "priority-medium", 
  low: "priority-low"
};

export function NewsBriefingWidget({ 
  widget,
  isExpanded = false,
  onToggleExpanded
}: NewsBriefingWidgetProps) {
  const symbol = widget.config?.symbol || "AAPL";
  const companyName = useMemo(() => symbol.toUpperCase(), [symbol]); // Memoize to prevent re-computation
  
  const [currentDateTime, setCurrentDateTime] = useState("");
  const [newsData, setNewsData] = useState<ProcessedNewsItem[]>([]);
  const [pressReleases, setPressReleases] = useState<PressRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Date range filter state
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);

  useEffect(() => {
    const updateTime = () => {
      setCurrentDateTime(
        new Date().toLocaleString("en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Date validation - ensure 1-year window max
  const validateDateRange = useCallback((from: string, to: string): string | null => {
    if (!from || !to) return null;
    
    const fromDateObj = new Date(from);
    const toDateObj = new Date(to);
    
    if (fromDateObj > toDateObj) {
      return "Start date must be before end date";
    }
    
    const diffTime = toDateObj.getTime() - fromDateObj.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    
    if (diffDays > 365) {
      return "Date range cannot exceed 1 year";
    }
    
    return null;
  }, []);

  const fetchNewsData = useCallback(async () => {
    if (!symbol) {
      console.log(`🚨 [NEWS-WIDGET] No symbol provided, symbol is:`, symbol);
      return;
    }
    
    console.log(`🚀 [NEWS-WIDGET] Starting fetch for symbol: ${symbol}`);
    setLoading(true);
    setError(null);
    
    try {
      console.log(`📰 [NEWS-WIDGET] Fetching news for ${symbol}...`);
      
      // Use date range if provided
      const dateFrom = fromDate || undefined;
      const dateTo = toDate || undefined;
      
      // Fetch both news and press releases
      const [news, releases] = await Promise.all([
        newsService.getCompanyNews(symbol, 100, dateFrom, dateTo),
        newsService.getPressReleases(symbol, 100, dateFrom, dateTo)
      ]);
      
      console.log(`📊 [NEWS-WIDGET] Got ${news.length} news items and ${releases.length} press releases for ${symbol}`);
      console.log(`📊 [NEWS-WIDGET] Sample news item:`, news[0]);
      
      setNewsData(news);
      setPressReleases(releases);
    } catch (error) {
      console.error('💥 [NEWS-WIDGET] Error fetching news:', error);
      setError('Failed to fetch news data');
      // Fallback to empty data on error
      setNewsData([]);
    } finally {
      setLoading(false);
    }
  }, [symbol, fromDate, toDate]);

  useEffect(() => {
    fetchNewsData();
  }, [fetchNewsData]);

  // Handle date filter changes
  const handleApplyDateFilter = useCallback(() => {
    const validation = validateDateRange(fromDate, toDate);
    if (validation) {
      setDateError(validation);
      return;
    }
    
    setDateError(null);
    setShowDateFilter(false);
    // fetchNewsData will be called automatically due to dependency changes
  }, [fromDate, toDate, validateDateRange]);

  const handleClearDateFilter = useCallback(() => {
    setFromDate("");
    setToDate("");
    setDateError(null);
    setShowDateFilter(false);
    // fetchNewsData will be called automatically due to dependency changes
  }, []);

  // Set default date range to last 6 months if not set
  useEffect(() => {
    if (!fromDate && !toDate) {
      const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
      const today = new Date();
      setFromDate(sixMonthsAgo.toISOString().split('T')[0]);
      setToDate(today.toISOString().split('T')[0]);
    }
  }, [fromDate, toDate]);

  // Transform ProcessedNewsItem to NewsItem format for compatibility - memoized
  const transformedNews: NewsItem[] = useMemo(() => newsData.map(item => ({
    id: item.id,
    title: item.title,
    date: item.publishedDate,
    priority: item.priority,
    category: item.category,
    classification: item.classification,
    url: item.url,
    site: item.site,
  })), [newsData]);

  const groupedNews = useMemo(() => transformedNews
    .filter(item => item.category !== "press_release") // Remove press_release items to avoid duplication
    .reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, NewsItem[]>), [transformedNews]);

  // Count priorities - memoized
  const priorityCounts = useMemo(() => transformedNews.reduce((acc, item) => {
    acc[item.priority] = (acc[item.priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>), [transformedNews]);

  const capitalActionCount = useMemo(() => 
    transformedNews.filter(item => item.category === "capital").length,
    [transformedNews]
  );

  // Compact view for non-expanded state
  if (!isExpanded) {
    return (
      <div 
        className="font-mono cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggleExpanded}
      >
        <style jsx>{`
          .text-priority-high { color: #ef4444; }
          .text-priority-medium { color: #f59e0b; }
          .text-priority-low { color: #3b82f6; }
          .text-terminal-green { color: #22c55e; }
        `}</style>

        {/* Compact Header */}
        <div className="border-l-4 border-primary">
          <div className="bg-primary/10 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-primary" />
              <span className="font-bold text-sm tracking-wider">NEWS BRIEFING</span>
              {loading && <span className="text-xs text-muted-foreground">(Loading...)</span>}
            </div>
            <span className="text-xs text-muted-foreground">{currentDateTime.split(' ')[0]}</span>
          </div>

          {/* Priority Summary */}
          <div className="px-4 py-3 bg-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Intelligence Summary</span>
              <Badge variant="outline" className="text-xs">
                {transformedNews.length} ITEMS
              </Badge>
            </div>
            
            <div className="grid grid-cols-5 gap-2 text-center">
              <div>
                <div className="text-lg font-bold text-priority-high">{priorityCounts.high || 0}</div>
                <div className="text-[10px] text-muted-foreground">HIGH</div>
              </div>
              <div>
                <div className="text-lg font-bold text-priority-medium">{priorityCounts.medium || 0}</div>
                <div className="text-[10px] text-muted-foreground">MED</div>
              </div>
              <div>
                <div className="text-lg font-bold text-priority-low">{priorityCounts.low || 0}</div>
                <div className="text-[10px] text-muted-foreground">LOW</div>
              </div>
              <div>
                <div className="text-lg font-bold text-terminal-green">{capitalActionCount}</div>
                <div className="text-[10px] text-muted-foreground">CAP</div>
              </div>
              <div>
                <div className="text-lg font-bold text-blue-400">{pressReleases.length}</div>
                <div className="text-[10px] text-muted-foreground">PR</div>
              </div>
            </div>
          </div>

          {/* Latest High Priority Items Preview */}
          <div className="border-t px-4 py-2 space-y-2">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Latest Intel</div>
            {error ? (
              <div className="text-xs text-red-500">Error loading news data</div>
            ) : loading ? (
              <div className="text-xs text-muted-foreground">Loading news...</div>
            ) : transformedNews.length === 0 ? (
              <div className="text-xs text-muted-foreground">No news available</div>
            ) : (
              transformedNews
                .filter(item => item.priority === "high")
                .map(item => (
                  <div key={item.id} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-priority-high mt-1 flex-shrink-0" />
                    <p className="text-xs leading-tight line-clamp-2">{item.title}</p>
                  </div>
                ))
            )}
          </div>

          {/* Click to Expand */}
          <div className="px-4 py-2 text-center border-t bg-muted/50">
            <span className="text-xs text-muted-foreground">CLICK TO VIEW FULL BRIEFING</span>
          </div>
        </div>
      </div>
    );
  }

  // Full expanded view (original design)
  return (
    <div className="font-mono">
      <style jsx>{`
        .bg-classified {
          background-color: hsl(var(--muted));
        }
        .text-priority-high {
          color: #ef4444;
        }
        .text-priority-medium {
          color: #f59e0b;
        }
        .text-priority-low {
          color: #3b82f6;
        }
        .text-terminal-green {
          color: #22c55e;
        }
        .bg-priority-high {
          background-color: #ef4444;
        }
        .bg-priority-medium {
          background-color: #f59e0b;
        }
        .bg-priority-low {
          background-color: #3b82f6;
        }
        .border-priority-high {
          border-color: #ef4444;
        }
        .border-priority-medium {
          border-color: #f59e0b;
        }
        .border-priority-low {
          border-color: #3b82f6;
        }
      `}</style>

      <div className="space-y-6">
        {/* Header */}
        <div className="border-2 border-primary bg-card">
          <div className="bg-primary text-primary-foreground px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-bold tracking-wider">{companyName.toUpperCase()} NEWS BRIEFING</span>
            </div>
            <div className="flex items-center gap-4">
              {/* Date Filter */}
              <Popover open={showDateFilter} onOpenChange={setShowDateFilter}>
                <PopoverTrigger asChild>
                  <Button variant="secondary" size="sm" className="flex items-center gap-2 text-xs">
                    <Filter className="w-3 h-3" />
                    {fromDate && toDate ? 
                      `${fromDate.split('-').slice(1).join('/')}/${fromDate.split('-')[0]} - ${toDate.split('-').slice(1).join('/')}/${toDate.split('-')[0]}` : 
                      'Filter Dates'
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4" align="end">
                  <div className="space-y-4">
                    <h4 className="font-bold text-sm">Filter News by Date Range</h4>
                    <p className="text-xs text-muted-foreground">Select up to 1 year of data</p>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="from-date" className="text-xs">From Date</Label>
                        <Input
                          id="from-date"
                          type="date"
                          value={fromDate}
                          onChange={(e) => setFromDate(e.target.value)}
                          className="text-xs"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="to-date" className="text-xs">To Date</Label>
                        <Input
                          id="to-date"
                          type="date"
                          value={toDate}
                          onChange={(e) => setToDate(e.target.value)}
                          className="text-xs"
                        />
                      </div>
                    </div>
                    
                    {dateError && (
                      <div className="text-xs text-red-500 bg-red-50 p-2 rounded">
                        {dateError}
                      </div>
                    )}
                    
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={handleClearDateFilter} className="text-xs">
                        Clear
                      </Button>
                      <Button size="sm" onClick={handleApplyDateFilter} className="text-xs">
                        Apply Filter
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4" />
                <span>LAST UPDATED: {currentDateTime}</span>
              </div>
            </div>
          </div>
          
          <div className="p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">CLASSIFICATION:</span>
              <Badge variant="secondary" className="bg-classified text-foreground">
                UNCLASSIFIED
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">SUBJECT:</span>
              <span className="text-foreground">{companyName.toUpperCase()} CORPORATION ({symbol})</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">DATE:</span>
              <span className="text-foreground">{new Date().toISOString().split('T')[0]}</span>
            </div>
          </div>
        </div>

        {/* Status Summary */}
        <Card className="border-2 border-accent">
          <div className="bg-accent text-accent-foreground px-4 py-2">
            <span className="font-bold tracking-wider">INTELLIGENCE SUMMARY</span>
            {loading && <span className="ml-2 text-sm">(Loading...)</span>}
          </div>
          <div className="p-4 grid grid-cols-5 gap-4 text-center">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-priority-high">{priorityCounts.high || 0}</div>
              <div className="text-xs text-muted-foreground">HIGH PRIORITY</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-priority-medium">{priorityCounts.medium || 0}</div>
              <div className="text-xs text-muted-foreground">MEDIUM PRIORITY</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-priority-low">{priorityCounts.low || 0}</div>
              <div className="text-xs text-muted-foreground">LOW PRIORITY</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-terminal-green">{capitalActionCount}</div>
              <div className="text-xs text-muted-foreground">CAPITAL ACTIONS</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-blue-400">{pressReleases.length}</div>
              <div className="text-xs text-muted-foreground">PRESS RELEASES</div>
            </div>
          </div>
        </Card>

        {/* Press Releases Section */}
        {pressReleases.length > 0 && (
          <Card className="border-2 border-blue-500/20">
            <div className="bg-blue-500/10 text-foreground px-4 py-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="font-bold tracking-wider">PRESS RELEASES</span>
              <Badge variant="secondary" className="ml-auto">
                {pressReleases.length} ITEMS
              </Badge>
            </div>
            
            <div className="divide-y divide-border">
              {pressReleases.map((release) => (
                <div key={release.id} className="p-4 flex items-start gap-4 group">
                  <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-foreground font-medium leading-tight group-hover:text-blue-400 transition-colors">
                          {release.title}
                        </h3>
                        {release.url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 mt-1 text-xs text-muted-foreground hover:text-blue-400"
                            onClick={() => window.open(release.url, '_blank')}
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Read Full Release
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="outline" className="text-xs text-blue-400 border-blue-400">
                          OFFICIAL
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>DATE: {release.publishedDate}</span>
                      <span>SOURCE: {release.site}</span>
                      <span>CLASS: UNCLASSIFIED</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* News Categories */}
        {error ? (
          <Card className="border-2 border-red-500/20">
            <div className="bg-red-500/10 text-foreground px-4 py-2">
              <span className="font-bold tracking-wider">ERROR</span>
            </div>
            <div className="p-4 text-center text-red-500">
              Failed to load news data. Please try again later.
            </div>
          </Card>
        ) : Object.entries(groupedNews).length === 0 && !loading ? (
          <Card className="border-2 border-muted">
            <div className="bg-muted text-muted-foreground px-4 py-2">
              <span className="font-bold tracking-wider">NO NEWS DATA</span>
            </div>
            <div className="p-4 text-center text-muted-foreground">
              No news articles found for {symbol}.
            </div>
          </Card>
        ) : (
          Object.entries(groupedNews).map(([category, items]) => {
            const Icon = categoryIcons[category as keyof typeof categoryIcons];
            
            return (
              <Card key={category} className="border-2 border-muted">
                <div className="bg-muted text-muted-foreground px-4 py-2 flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span className="font-bold tracking-wider">
                    {categoryLabels[category as keyof typeof categoryLabels]}
                  </span>
                  <Badge variant="secondary" className="ml-auto">
                    {items.length} ITEMS
                  </Badge>
                </div>
                
                <div className="divide-y divide-border">
                  {items.map((item) => (
                    <div key={item.id} className="p-4 flex items-start gap-4 group">
                      <div className={`w-2 h-2 rounded-full bg-${priorityColors[item.priority]} mt-2 flex-shrink-0`} />
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="text-foreground font-medium leading-tight group-hover:text-primary transition-colors">
                              {item.title}
                            </h3>
                            {item.url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-auto p-0 mt-1 text-xs text-muted-foreground hover:text-primary"
                                onClick={() => window.open(item.url, '_blank')}
                              >
                                <ExternalLink className="w-3 h-3 mr-1" />
                                Read Article
                              </Button>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge 
                              variant="outline" 
                              className={`text-xs border-${priorityColors[item.priority]} text-${priorityColors[item.priority]}`}
                            >
                              {item.priority.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>DATE: {item.date}</span>
                          <span>SOURCE: {item.site}</span>
                          <span>CLASS: {item.classification}</span>
                          <span>ID: {item.id.split('-').pop()?.padStart(4, '0')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })
        )}

        {/* Footer */}
        <div className="border border-border p-4 bg-card text-center">
          <div className="text-xs text-muted-foreground space-y-1">
            <div>CLASSIFICATION: UNCLASSIFIED</div>
            <div>DISTRIBUTION: AUTHORIZED PERSONNEL ONLY</div>
            <div>GENERATED: {currentDateTime} UTC</div>
          </div>
        </div>
      </div>
    </div>
  );
}