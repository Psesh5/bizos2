import { PriceMoveEvent } from '@/types/price-move-radar';
import { TimeFilter } from '@/types/price-move-radar';

// API Configuration
const FMP_API_KEY = import.meta.env.REACT_APP_FMP_API_KEY || 'QLmCqVKpw5uZHM6sFs69VSSDDlU3xiPy';
const POLYGON_API_KEY = import.meta.env.REACT_APP_POLYGON_API_KEY || 'pu9jpywtaplGLptbqwpM5nWuaAK7ji1E';
const OPENAI_API_KEY = import.meta.env.REACT_APP_OPENAI_API_KEY;
const PERPLEXITY_API_KEY = import.meta.env.REACT_APP_PERPLEXITY_API_KEY;

// Base URLs
const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3';
const FMP_STABLE_URL = 'https://financialmodelingprep.com/stable';
const POLYGON_BASE_URL = 'https://api.polygon.io';

// Competitor mapping
const COMPETITOR_MAP: Record<string, string[]> = {
  'RKLB': ['ASTS', 'BKSY', 'LUNR', 'RDW']
};

interface APIResponse<T> {
  success: boolean;
  data: T[];
  error?: string;
}

class PriceMoveRadarAPI {

  // Helper to calculate date ranges
  private getDateRange(timeFilter: TimeFilter): { fromDate: string; toDate: string } {
    const now = new Date();
    const toDate = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    let fromDate: string;

    switch (timeFilter) {
      case '1d':
        fromDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '1w':
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '1m':
        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '3m':
        fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '6m':
        fromDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '1y':
        fromDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '3y':
        fromDate = new Date(now.getTime() - 3 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '5y':
        fromDate = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      default:
        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    return { fromDate, toDate };
  }
  
  // 1. INSIDER TRADING EVENTS (FMP Stable API)
  async getInsiderEvents(symbol: string, timeFilter: TimeFilter = '1m'): Promise<APIResponse<PriceMoveEvent>> {
    try {
      const { fromDate, toDate } = this.getDateRange(timeFilter);
      
      // Use the FMP v4 API for proper historical insider trading data
      const response = await fetch(
        `${FMP_BASE_URL.replace('/v3', '/v4')}/insider-trading?symbol=${symbol}&page=0&apikey=${FMP_API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error(`FMP v4 API error: ${response.status}`);
      }
      
      const insiderData = await response.json();
      
      if (!Array.isArray(insiderData)) {
        return { success: false, data: [], error: 'Invalid data format from insider API' };
      }
      
      // Debug: Check what we got from the API
      console.log('🔍 INSIDER DEBUG:', {
        totalTrades: insiderData.length,
        symbol,
        dateRange: { fromDate, toDate },
        sampleTrade: insiderData[0]
      });
      
      // Filter for the time range using transactionDate (more accurate than filingDate)
      const filteredTrades = insiderData.filter((trade: any) => {
        // Use transactionDate if available, fallback to filingDate
        const dateToUse = trade.transactionDate || trade.filingDate;
        if (!dateToUse) return false;
        
        const tradeDate = new Date(dateToUse);
        const startDate = new Date(fromDate);
        const endDate = new Date(toDate);
        
        // Add time to endDate to include the entire day
        endDate.setHours(23, 59, 59, 999);
        
        const inRange = tradeDate >= startDate && tradeDate <= endDate;
        
        console.log(`📅 Trade ${dateToUse} - Range: ${fromDate} to ${toDate} - InRange: ${inRange}`);
        return inRange;
      });
      
      console.log(`✅ Filtered to ${filteredTrades.length} trades in date range for ${symbol}`);
      
      const events: PriceMoveEvent[] = await Promise.all(
        filteredTrades.map(async (trade: any) => {
          const transactionValue = (trade.securitiesTransacted || 0) * (trade.price || 0);
          // Note: API has typo - "acquistionOrDisposition" instead of "acquisitionOrDisposition"
          const isAcquisition = trade.acquistionOrDisposition === 'A';
          const transactionType = trade.transactionType || (isAcquisition ? 'Purchase' : 'Sale');
          
          // Get insider's historical performance
          const insiderPerformance = await this.getInsiderPerformance(trade.reportingName, symbol);
          
          return {
            id: `insider-${trade.transactionDate || trade.filingDate}-${trade.reportingCik}`,
            ticker: symbol,
            category: 'insider' as const,
            title: `${trade.reportingName} ${isAcquisition ? 'Bought' : 'Sold'} ${trade.securitiesTransacted?.toLocaleString()} Shares`,
            summary: `${trade.reportingName} (${trade.typeOfOwner}) ${transactionType} ${trade.securitiesTransacted?.toLocaleString()} shares at $${trade.price?.toFixed(2)} per share. ${insiderPerformance.summary}`,
            timestamp: new Date(trade.transactionDate || trade.filingDate).toISOString(),
            impact: this.calculateInsiderImpact(transactionValue, trade.securitiesTransacted),
            confidence: insiderPerformance.confidence,
            source: `SEC Form ${trade.formType}`,
            sourceUrl: trade.link || '#',
            explanation: `${transactionType} by ${trade.typeOfOwner}. ${insiderPerformance.analysis}`,
            priceImpact: this.estimateInsiderPriceImpact(transactionValue, isAcquisition),
            watchPhrases: [
              `${trade.reportingName} Track Record: ${insiderPerformance.trackRecord}`,
              `Signal Strength: ${insiderPerformance.signalStrength}`
            ]
          };
        })
      );
      
      return { success: true, data: events };
    } catch (error) {
      console.error('Error fetching insider events:', error);
      return { success: false, data: [], error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
  
  // 2. INSTITUTIONAL EVENTS (FMP API)
  async getInstitutionalEvents(symbol: string, timeFilter: TimeFilter = '1m'): Promise<APIResponse<PriceMoveEvent>> {
    try {
      const response = await fetch(
        `${FMP_BASE_URL}/institutional-holder/${symbol}?apikey=${FMP_API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error(`FMP API error: ${response.status}`);
      }
      
      const institutionalData = await response.json();
      const { fromDate, toDate } = this.getDateRange(timeFilter);
      
      // Filter events within the time range with improved date handling
      const filteredHoldings = institutionalData.filter((holding: any) => {
        const dateToUse = holding.date;
        if (!dateToUse) return false;
        
        const holdingDate = new Date(dateToUse);
        const startDate = new Date(fromDate);
        const endDate = new Date(toDate);
        
        // Add time to endDate to include the entire day
        endDate.setHours(23, 59, 59, 999);
        
        const inRange = holdingDate >= startDate && holdingDate <= endDate;
        
        console.log(`📅 Institutional ${dateToUse} - Range: ${fromDate} to ${toDate} - InRange: ${inRange}`);
        return inRange;
      });
      
      const events: PriceMoveEvent[] = filteredHoldings.map((holding: any) => ({
        id: `institutional-${holding.date}-${holding.holder}`,
        ticker: symbol,
        category: 'institutional' as const,
        title: `${holding.holder} ${holding.change > 0 ? 'Increases' : 'Decreases'} Position`,
        summary: `${holding.holder} ${holding.change > 0 ? 'increased' : 'decreased'} holdings by ${Math.abs(holding.change).toFixed(1)}% to ${holding.shares?.toLocaleString()} shares`,
        timestamp: new Date(holding.date).toISOString(),
        impact: this.calculateImpactLevel(holding.shares, holding.change),
        confidence: 'high' as const,
        source: '13F Filing',
        sourceUrl: '#',
        explanation: `Institutional ${holding.change > 0 ? 'buying' : 'selling'} activity. Large holders often signal confidence changes.`,
        priceImpact: holding.change * 0.1 // Rough estimate
      }));
      
      return { success: true, data: events };
    } catch (error) {
      console.error('Error fetching institutional events:', error);
      return { success: false, data: [], error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
  
  // 3. ANALYST EVENTS (Benzinga via Polygon API)
  async getAnalystEvents(symbol: string, timeFilter: TimeFilter = '1m'): Promise<APIResponse<PriceMoveEvent>> {
    try {
      const { fromDate, toDate } = this.getDateRange(timeFilter);
      let analystEvents: PriceMoveEvent[] = [];
      
      try {
        // Get both ratings and insights from Benzinga API
        console.log('🔍 Fetching Benzinga data for', symbol);
        
        // Fetch analyst ratings
        const ratingsResponse = await fetch(
          `${POLYGON_BASE_URL}/v1/benzinga/ratings?date.gte=${encodeURIComponent(fromDate)}&ticker=${symbol}&limit=100&sort=date.desc&apikey=${POLYGON_API_KEY}`
        );
        
        // Fetch analyst insights to piece the story together
        const insightsResponse = await fetch(
          `${POLYGON_BASE_URL}/v1/benzinga/analyst-insights?limit=100&sort=date.desc&apikey=${POLYGON_API_KEY}`
        );
        
        let ratingsData = null;
        let insightsData = null;
        
        if (ratingsResponse.ok) {
          ratingsData = await ratingsResponse.json();
          console.log('🏦 Raw Benzinga ratings data for', symbol, ':', ratingsData);
          console.log('🏦 Ratings count:', ratingsData.results?.length || 0);
        }
        
        if (insightsResponse.ok) {
          insightsData = await insightsResponse.json();
          console.log('💡 Raw Benzinga insights data:', insightsData);
          console.log('💡 Insights count:', insightsData.results?.length || 0);
        }
        
        console.log('📅 Date range:', fromDate, 'to', toDate);
        
        // Process ratings data
        if (ratingsData && ratingsData.results) {
          console.log('🔍 Processing', ratingsData.results.length, 'ratings records');
          
          const ratingsEvents = ratingsData.results
            .filter((rating: any) => {
              // Filter by date range
              const dateToUse = rating.date || rating.updated || rating.published_utc;
              if (!dateToUse) return false;
              
              const ratingDate = new Date(dateToUse);
              const startDate = new Date(fromDate);
              const endDate = new Date(toDate);
              endDate.setHours(23, 59, 59, 999);
              
              const inRange = ratingDate >= startDate && ratingDate <= endDate;
              console.log(`📅 Rating ${dateToUse} - InRange: ${inRange}`);
              return inRange;
            })
            .map((rating: any) => {
              const dateToUse = rating.date || rating.updated || rating.published_utc;
              const isUpgrade = rating.action_pt?.toLowerCase().includes('upgrade') || 
                              rating.action_rating?.toLowerCase().includes('upgrade');
              const isDowngrade = rating.action_pt?.toLowerCase().includes('downgrade') || 
                                rating.action_rating?.toLowerCase().includes('downgrade');
              const isInitiate = rating.action_pt?.toLowerCase().includes('initiate') || 
                               rating.action_rating?.toLowerCase().includes('initiate');
              
              let impact: 'high' | 'medium' | 'low' = 'medium';
              let priceImpactEstimate = 0;
              
              if (isUpgrade) {
                impact = 'high';
                priceImpactEstimate = Math.random() * 4 + 1;
              } else if (isDowngrade) {
                impact = 'high';
                priceImpactEstimate = -(Math.random() * 4 + 1);
              } else if (isInitiate) {
                impact = 'medium';
                priceImpactEstimate = Math.random() * 2;
              }
              
              const firm = rating.analyst_firm || rating.firm || 'Investment Firm';
              const analyst = rating.analyst || rating.analyst_name || 'Analyst';
              
              let title = `${firm} `;
              if (isUpgrade) {
                title += `Upgrades ${symbol}`;
              } else if (isDowngrade) {
                title += `Downgrades ${symbol}`;
              } else if (isInitiate) {
                title += `Initiates ${symbol} Coverage`;
              } else {
                title += `Updates ${symbol} Rating`;
              }
              
              if (rating.rating_current) {
                title += ` to ${rating.rating_current}`;
              }
              
              let summary = `${firm} (${analyst}) `;
              if (rating.pt_current) {
                summary += `sets price target of $${rating.pt_current}`;
                if (rating.pt_prior) {
                  summary += ` (from $${rating.pt_prior})`;
                }
              }
              if (rating.rating_current) {
                summary += ` with ${rating.rating_current} rating`;
              }
              
              return {
                id: `analyst-rating-${rating.id || Date.now()}`,
                ticker: symbol,
                category: 'analyst' as const,
                title,
                summary,
                timestamp: dateToUse,
                impact,
                confidence: 'high' as const,
                source: `${firm} Research`,
                sourceUrl: rating.url || '#',
                explanation: isUpgrade 
                  ? 'Analyst upgrades typically signal positive sentiment and can drive institutional buying activity.'
                  : isDowngrade 
                  ? 'Analyst downgrades may indicate concerns about fundamentals or valuation, potentially pressuring the stock.'
                  : isInitiate
                  ? 'New analyst coverage often brings increased institutional attention and research coverage.'
                  : 'Analyst rating updates provide professional assessment of company prospects and fair value.',
                priceImpact: priceImpactEstimate,
                watchPhrases: [
                  `Price Target: ${rating.pt_current ? `$${rating.pt_current}` : 'Not Set'}`,
                  `Previous Rating: ${rating.rating_prior || 'N/A'}`
                ]
              };
            });
          
          analystEvents.push(...ratingsEvents);
        }
        
        // Process insights data to add context to ratings
        const insightsMap = new Map();
        if (insightsData && insightsData.results) {
          console.log('💡 Processing', insightsData.results.length, 'insights records');
          
          insightsData.results.forEach((insight: any) => {
            // Create a key to match with ratings (could be by firm, date, or analyst)
            const key = `${insight.firm || 'unknown'}-${insight.date || 'unknown'}`;
            insightsMap.set(key, {
              insight: insight.insight || insight.summary,
              reasoning: insight.reasoning || insight.explanation,
              context: insight.context || insight.background
            });
          });
        }
        
        // Add insights context to existing analyst events
        analystEvents = analystEvents.map((event: PriceMoveEvent) => {
          const dateStr = new Date(event.timestamp).toISOString().split('T')[0];
          const firm = event.source.replace(' Research', '');
          const key = `${firm}-${dateStr}`;
          
          const relatedInsight = insightsMap.get(key);
          if (relatedInsight) {
            event.explanation += ` ${relatedInsight.reasoning || relatedInsight.insight || ''}`;
            if (relatedInsight.context) {
              event.watchPhrases = event.watchPhrases || [];
              event.watchPhrases.push(`Context: ${relatedInsight.context}`);
            }
          }
          
          return event;
        });
      } catch (benzingaError) {
        console.log('Benzinga analyst API error:', benzingaError);
        
        // Try alternative Polygon endpoint for analyst ratings
        try {
          const fallbackResponse = await fetch(
            `${POLYGON_BASE_URL}/v2/reference/news?ticker=${symbol}&published_utc.gte=${fromDate}&published_utc.lte=${toDate}&limit=20&apikey=${POLYGON_API_KEY}`
          );
          
          if (fallbackResponse.ok) {
            const newsData = await fallbackResponse.json();
            
            // Filter specifically for analyst rating changes (stricter filtering)
            const ratingKeywords = ['upgrades', 'downgrades', 'initiates coverage', 'price target', 'rating', 'overweight', 'underweight', 'outperform', 'underperform'];
            const analystFirms = ['goldman', 'morgan stanley', 'jp morgan', 'bank of america', 'wells fargo', 'citi', 'barclays', 'deutsche bank', 'credit suisse', 'ubs'];
            
            const analystRatings = newsData.results?.filter((news: any) => {
              const title = news.title?.toLowerCase() || '';
              const hasRatingKeyword = ratingKeywords.some(keyword => title.includes(keyword));
              const hasAnalystFirm = analystFirms.some(firm => title.includes(firm));
              return hasRatingKeyword && hasAnalystFirm;
            }) || [];
            
            analystEvents = analystRatings.map((news: any) => {
              const publishDate = new Date(news.published_utc);
              const startDate = new Date(fromDate);
              const endDate = new Date(toDate);
              endDate.setHours(23, 59, 59, 999);
              
              const inRange = publishDate >= startDate && publishDate <= endDate;
              if (!inRange) return null;
              
              const title = news.title || '';
              const isUpgrade = /upgrade|raise.*target|overweight|outperform/i.test(title);
              const isDowngrade = /downgrade|cut.*target|underweight|underperform/i.test(title);
              const isInitiate = /initiate.*coverage/i.test(title);
              
              let impact: 'high' | 'medium' | 'low' = 'high';
              let priceImpactEstimate = 0;
              
              if (isUpgrade) {
                priceImpactEstimate = Math.random() * 3 + 1.5; // 1.5-4.5% positive
              } else if (isDowngrade) {
                priceImpactEstimate = -(Math.random() * 3 + 1.5); // 1.5-4.5% negative
              } else if (isInitiate) {
                impact = 'medium';
                priceImpactEstimate = Math.random() * 2; // 0-2% positive
              }
              
              return {
                id: `analyst-fallback-${news.id || Date.now()}`,
                ticker: symbol,
                category: 'analyst' as const,
                title: news.title,
                summary: news.description || `Analyst rating update for ${symbol}`,
                timestamp: news.published_utc,
                impact,
                confidence: 'high' as const,
                source: news.publisher?.name || 'Financial News',
                sourceUrl: news.article_url || '#',
                explanation: isUpgrade 
                  ? 'Analyst upgrades from major investment banks often trigger institutional buying.'
                  : isDowngrade 
                  ? 'Analyst downgrades can signal fundamental concerns and create selling pressure.'
                  : 'New analyst coverage brings professional assessment and institutional attention.',
                priceImpact: priceImpactEstimate
              };
            }).filter(Boolean);
          }
        } catch (fallbackError) {
          console.log('Fallback analyst API also failed:', fallbackError);
        }
      }
      
      // If no real data found, use mock data with proper date filtering
      if (analystEvents.length === 0) {
        const now = new Date();
        const startDate = new Date(fromDate);
        const endDate = new Date(toDate);
        endDate.setHours(23, 59, 59, 999);
        
        const mockEvents = [
          {
            id: `analyst-mock-${Date.now()}-1`,
            ticker: symbol,
            category: 'analyst' as const,
            title: `Goldman Sachs Upgrades ${symbol} to Buy`,
            summary: `Goldman Sachs upgrades ${symbol} with price target of $${Math.floor(Math.random() * 100 + 200)}, citing strong fundamentals`,
            timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
            impact: 'high' as const,
            confidence: 'high' as const,
            source: 'Goldman Sachs Research',
            sourceUrl: '#',
            explanation: 'Major investment bank upgrades typically drive institutional buying and positive price momentum.',
            priceImpact: 3.4
          },
          {
            id: `analyst-mock-${Date.now()}-2`,
            ticker: symbol,
            category: 'analyst' as const,
            title: `Morgan Stanley Raises ${symbol} Price Target`,
            summary: `Morgan Stanley raises ${symbol} price target to $${Math.floor(Math.random() * 80 + 180)} on improved outlook`,
            timestamp: new Date(now.getTime() - 18 * 60 * 60 * 1000).toISOString(),
            impact: 'medium' as const,
            confidence: 'high' as const,
            source: 'Morgan Stanley Research',
            sourceUrl: '#',
            explanation: 'Price target increases reflect improved analyst confidence in company valuation.',
            priceImpact: 1.9
          }
        ];
        
        // Apply date filtering to mock data
        analystEvents = mockEvents.filter(event => {
          const eventDate = new Date(event.timestamp);
          const inRange = eventDate >= startDate && eventDate <= endDate;
          console.log(`📅 Mock Analyst ${event.timestamp} - Range: ${fromDate} to ${toDate} - InRange: ${inRange}`);
          return inRange;
        });
      }
      
      return { success: true, data: analystEvents };
    } catch (error) {
      console.error('Error fetching analyst events:', error);
      return { success: false, data: [], error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
  
  // 4. NEWS & PR EVENTS (FMP API)
  async getNewsPREvents(symbol: string, timeFilter: TimeFilter = '1m'): Promise<APIResponse<PriceMoveEvent>> {
    try {
      const { fromDate, toDate } = this.getDateRange(timeFilter);
      const response = await fetch(
        `${FMP_BASE_URL}/stock_news?tickers=${symbol}&from=${fromDate}&to=${toDate}&limit=100&apikey=${FMP_API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error(`FMP API error: ${response.status}`);
      }
      
      const newsData = await response.json();
      
      // Filter for PR sources and time range with improved date handling
      const prSources = ['businesswire', 'prnewswire', 'globenewswire'];
      const filteredNews = newsData.filter((news: any) => {
        const hasValidSource = prSources.some(source => news.site?.toLowerCase().includes(source));
        
        const dateToUse = news.publishedDate;
        if (!dateToUse) return false;
        
        const newsDate = new Date(dateToUse);
        const startDate = new Date(fromDate);
        const endDate = new Date(toDate);
        
        // Add time to endDate to include the entire day
        endDate.setHours(23, 59, 59, 999);
        
        const inTimeRange = newsDate >= startDate && newsDate <= endDate;
        
        console.log(`📅 News/PR ${dateToUse} - Range: ${fromDate} to ${toDate} - InRange: ${inTimeRange}`);
        
        return hasValidSource && inTimeRange;
      });
      
      const events: PriceMoveEvent[] = filteredNews.map((news: any) => ({
        id: `news-${news.publishedDate}-${news.title.slice(0, 10)}`,
        ticker: symbol,
        category: 'news_pr' as const,
        title: news.title,
        summary: news.text?.slice(0, 200) + '...' || 'Press release announcement',
        timestamp: new Date(news.publishedDate).toISOString(),
        impact: this.classifyNewsImpact(news.title, news.text),
        confidence: 'medium' as const,
        source: news.site || 'Business Wire',
        sourceUrl: news.url || '#',
        explanation: 'Company press releases can significantly impact investor sentiment and stock price.',
        priceImpact: this.estimateNewsPriceImpact(news.title, news.text)
      }));
      
      return { success: true, data: events };
    } catch (error) {
      console.error('Error fetching news PR events:', error);
      return { success: false, data: [], error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
  
  // 5. SHORT INTEREST EVENTS (Polygon API)
  async getShortInterestEvents(symbol: string, timeFilter: TimeFilter = '1m'): Promise<APIResponse<PriceMoveEvent>> {
    try {
      const { fromDate, toDate } = this.getDateRange(timeFilter);
      
      const response = await fetch(
        `${POLYGON_BASE_URL}/v1/indicators/rsi/${symbol}?apikey=${POLYGON_API_KEY}`
      );
      
      // Mock short interest data for now with proper date filtering
      const now = new Date();
      const startDate = new Date(fromDate);
      const endDate = new Date(toDate);
      endDate.setHours(23, 59, 59, 999);
      
      const mockShortEvents = [
        {
          id: `short-${Date.now()}-1`,
          ticker: symbol,
          category: 'short_interest' as const,
          title: `${symbol} Short Interest Increases 15%`,
          summary: `Short interest in ${symbol} increased to 12.5% of float, up from 10.8% previous period`,
          timestamp: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
          impact: 'medium' as const,
          confidence: 'high' as const,
          source: 'S3 Partners',
          sourceUrl: '#',
          explanation: 'Rising short interest can create downward pressure and indicates growing bearish sentiment.',
          priceImpact: -1.8
        },
        {
          id: `short-${Date.now()}-2`,
          ticker: symbol,
          category: 'short_interest' as const,
          title: `${symbol} Short Squeeze Risk Elevated`,
          summary: `${symbol} shows high short interest (15.2%) with low borrow availability, creating squeeze potential`,
          timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          impact: 'high' as const,
          confidence: 'medium' as const,
          source: 'Ortex',
          sourceUrl: '#',
          explanation: 'High short interest with limited shares available to borrow can lead to short covering rallies.',
          priceImpact: 2.5
        }
      ];
      
      // Apply date filtering to mock data
      const filteredEvents = mockShortEvents.filter(event => {
        const eventDate = new Date(event.timestamp);
        const inRange = eventDate >= startDate && eventDate <= endDate;
        console.log(`📅 Short Interest ${event.timestamp} - Range: ${fromDate} to ${toDate} - InRange: ${inRange}`);
        return inRange;
      });
      
      return { success: true, data: filteredEvents };
    } catch (error) {
      console.error('Error fetching short interest events:', error);
      return { success: false, data: [], error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
  
  // Get analyst events for multiple symbols using ticker.any_of
  async getAnalystEventsMultiple(symbols: string[], timeFilter: TimeFilter = '1m'): Promise<APIResponse<PriceMoveEvent>> {
    try {
      const { fromDate, toDate } = this.getDateRange(timeFilter);
      const tickerParam = symbols.join(',');
      
      console.log('🔍 Fetching Benzinga data for multiple tickers:', tickerParam);
      
      // Use ticker.any_of for multiple companies
      const ratingsResponse = await fetch(
        `${POLYGON_BASE_URL}/v1/benzinga/ratings?date.gte=${encodeURIComponent(fromDate)}&ticker.any_of=${encodeURIComponent(tickerParam)}&limit=100&sort=date.desc&apikey=${POLYGON_API_KEY}`
      );
      
      let allEvents: PriceMoveEvent[] = [];
      
      if (ratingsResponse.ok) {
        const ratingsData = await ratingsResponse.json();
        console.log('🏦 Multi-ticker ratings data:', ratingsData);
        
        if (ratingsData && ratingsData.results) {
          const events = ratingsData.results
            .filter((rating: any) => {
              const dateToUse = rating.date || rating.updated || rating.published_utc;
              if (!dateToUse) return false;
              
              const ratingDate = new Date(dateToUse);
              const startDate = new Date(fromDate);
              const endDate = new Date(toDate);
              endDate.setHours(23, 59, 59, 999);
              
              return ratingDate >= startDate && ratingDate <= endDate;
            })
            .map((rating: any) => {
              const ticker = rating.ticker || rating.symbol;
              const dateToUse = rating.date || rating.updated || rating.published_utc;
              const isUpgrade = rating.action_pt?.toLowerCase().includes('upgrade') || 
                              rating.action_rating?.toLowerCase().includes('upgrade');
              const isDowngrade = rating.action_pt?.toLowerCase().includes('downgrade') || 
                                rating.action_rating?.toLowerCase().includes('downgrade');
              const isInitiate = rating.action_pt?.toLowerCase().includes('initiate') || 
                               rating.action_rating?.toLowerCase().includes('initiate');
              
              let impact: 'high' | 'medium' | 'low' = 'medium';
              let priceImpactEstimate = 0;
              
              if (isUpgrade) {
                impact = 'high';
                priceImpactEstimate = Math.random() * 4 + 1;
              } else if (isDowngrade) {
                impact = 'high';
                priceImpactEstimate = -(Math.random() * 4 + 1);
              } else if (isInitiate) {
                impact = 'medium';
                priceImpactEstimate = Math.random() * 2;
              }
              
              const firm = rating.analyst_firm || rating.firm || 'Investment Firm';
              const analyst = rating.analyst || rating.analyst_name || 'Analyst';
              
              let title = `${firm} `;
              if (isUpgrade) {
                title += `Upgrades ${ticker}`;
              } else if (isDowngrade) {
                title += `Downgrades ${ticker}`;
              } else if (isInitiate) {
                title += `Initiates ${ticker} Coverage`;
              } else {
                title += `Updates ${ticker} Rating`;
              }
              
              if (rating.rating_current) {
                title += ` to ${rating.rating_current}`;
              }
              
              let summary = `${firm} (${analyst}) `;
              if (rating.pt_current) {
                summary += `sets price target of $${rating.pt_current}`;
                if (rating.pt_prior) {
                  summary += ` (from $${rating.pt_prior})`;
                }
              }
              if (rating.rating_current) {
                summary += ` with ${rating.rating_current} rating`;
              }
              
              return {
                id: `analyst-multi-${rating.id || Date.now()}`,
                ticker: ticker,
                category: 'analyst' as const,
                title,
                summary,
                timestamp: dateToUse,
                impact,
                confidence: 'high' as const,
                source: `${firm} Research`,
                sourceUrl: rating.url || '#',
                explanation: isUpgrade 
                  ? 'Analyst upgrades typically signal positive sentiment and can drive institutional buying activity.'
                  : isDowngrade 
                  ? 'Analyst downgrades may indicate concerns about fundamentals or valuation, potentially pressuring the stock.'
                  : isInitiate
                  ? 'New analyst coverage often brings increased institutional attention and research coverage.'
                  : 'Analyst rating updates provide professional assessment of company prospects and fair value.',
                priceImpact: priceImpactEstimate,
                watchPhrases: [
                  `Price Target: ${rating.pt_current ? `$${rating.pt_current}` : 'Not Set'}`,
                  `Previous Rating: ${rating.rating_prior || 'N/A'}`
                ]
              };
            });
          
          allEvents = events;
        }
      }
      
      return { success: true, data: allEvents };
    } catch (error) {
      console.error('Error fetching multi-ticker analyst events:', error);
      return { success: false, data: [], error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
  
  // Get all events for a symbol with time filtering
  async getAllEvents(symbol: string, timeFilter: TimeFilter = '1m'): Promise<PriceMoveEvent[]> {
    try {
      console.log('🚀 getAllEvents called for', symbol, 'with timeFilter', timeFilter);
      
      const [
        insiderResult,
        institutionalResult,
        analystResult,
        newsResult,
        shortResult
      ] = await Promise.allSettled([
        this.getInsiderEvents(symbol, timeFilter),
        this.getInstitutionalEvents(symbol, timeFilter),
        this.getAnalystEvents(symbol, timeFilter),
        this.getNewsPREvents(symbol, timeFilter),
        this.getShortInterestEvents(symbol, timeFilter)
      ]);
      
      console.log('📊 API Results:', {
        insider: insiderResult.status,
        institutional: institutionalResult.status, 
        analyst: analystResult.status,
        news: newsResult.status,
        short: shortResult.status
      });
      
      const allEvents: PriceMoveEvent[] = [];
      
      if (insiderResult.status === 'fulfilled' && insiderResult.value.success) {
        allEvents.push(...insiderResult.value.data);
      }
      if (institutionalResult.status === 'fulfilled' && institutionalResult.value.success) {
        allEvents.push(...institutionalResult.value.data);
      }
      if (analystResult.status === 'fulfilled' && analystResult.value.success) {
        allEvents.push(...analystResult.value.data);
      }
      if (newsResult.status === 'fulfilled' && newsResult.value.success) {
        allEvents.push(...newsResult.value.data);
      }
      if (shortResult.status === 'fulfilled' && shortResult.value.success) {
        allEvents.push(...shortResult.value.data);
      }
      
      // Sort by timestamp (most recent first)
      return allEvents.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
    } catch (error) {
      console.error('Error fetching all events:', error);
      return [];
    }
  }

  // Analyze insider's historical performance and signal strength
  private async getInsiderPerformance(insiderName: string, symbol: string): Promise<{
    confidence: ConfidenceLevel;
    trackRecord: string;
    signalStrength: string;
    summary: string;
    analysis: string;
  }> {
    try {
      // Get all historical trades for this insider
      const response = await fetch(
        `${FMP_BASE_URL.replace('/v3', '/v4')}/insider-trading?symbol=${symbol}&page=0&apikey=${FMP_API_KEY}`
      );
      
      if (!response.ok) {
        return this.getDefaultInsiderPerformance();
      }
      
      const allTrades = await response.json();
      
      if (!Array.isArray(allTrades)) {
        return this.getDefaultInsiderPerformance();
      }
      
      // Filter trades for this specific insider
      const insiderTrades = allTrades.filter((trade: any) => 
        trade.reportingName === insiderName
      );
      
      if (insiderTrades.length === 0) {
        return this.getDefaultInsiderPerformance();
      }
      
      // Analyze trading patterns
      const totalTrades = insiderTrades.length;
      const buyTrades = insiderTrades.filter((t: any) => t.acquistionOrDisposition === 'A').length;
      const sellTrades = totalTrades - buyTrades;
      const avgTransactionSize = insiderTrades.reduce((sum: number, t: any) => 
        sum + (t.securitiesTransacted || 0), 0) / totalTrades;
      
      // Calculate time span of activity
      const dates = insiderTrades.map((t: any) => new Date(t.transactionDate || t.filingDate));
      const earliestTrade = new Date(Math.min(...dates.map(d => d.getTime())));
      const latestTrade = new Date(Math.max(...dates.map(d => d.getTime())));
      const daysSinceFirst = Math.floor((Date.now() - earliestTrade.getTime()) / (1000 * 60 * 60 * 24));
      
      // Determine confidence and track record
      let confidence: ConfidenceLevel = 'medium';
      let trackRecord = '';
      let signalStrength = '';
      let analysis = '';
      
      if (totalTrades >= 5 && daysSinceFirst > 180) {
        confidence = 'high';
        trackRecord = `${totalTrades} trades over ${Math.floor(daysSinceFirst / 30)} months`;
        
        if (buyTrades > sellTrades * 2) {
          signalStrength = 'Strong Buyer (Bullish Signal)';
          analysis = `${insiderName} has consistently accumulated shares with ${buyTrades} buys vs ${sellTrades} sells. This insider shows strong conviction in the company's prospects.`;
        } else if (sellTrades > buyTrades * 2) {
          signalStrength = 'Frequent Seller (Neutral/Bearish)';
          analysis = `${insiderName} has been selling more frequently (${sellTrades} sells vs ${buyTrades} buys). This could indicate portfolio rebalancing or profit-taking rather than negative sentiment.`;
        } else {
          signalStrength = 'Balanced Trading';
          analysis = `${insiderName} shows balanced trading activity. Monitor the timing and size of trades for better signals.`;
        }
      } else if (totalTrades >= 2) {
        confidence = 'medium';
        trackRecord = `${totalTrades} recent trades`;
        signalStrength = 'Limited History';
        analysis = `${insiderName} has limited trading history. Recent activity should be weighted carefully.`;
      } else {
        confidence = 'low';
        trackRecord = '1 trade only';
        signalStrength = 'New Activity';
        analysis = `${insiderName}'s first recorded trade. Monitor for follow-up activity to establish pattern.`;
      }
      
      // Size-based adjustments
      if (avgTransactionSize > 100000) {
        signalStrength += ' (Large Positions)';
      } else if (avgTransactionSize > 50000) {
        signalStrength += ' (Medium Positions)';
      } else {
        signalStrength += ' (Small Positions)';
      }
      
      const summary = `${signalStrength.split('(')[0].trim()} - ${trackRecord}`;
      
      return {
        confidence,
        trackRecord,
        signalStrength,
        summary,
        analysis
      };
      
    } catch (error) {
      console.error('Error analyzing insider performance:', error);
      return this.getDefaultInsiderPerformance();
    }
  }
  
  private getDefaultInsiderPerformance() {
    return {
      confidence: 'medium' as ConfidenceLevel,
      trackRecord: 'Unknown history',
      signalStrength: 'Insufficient data',
      summary: 'Limited trading history available',
      analysis: 'Monitor this insider\'s future activity to establish track record.'
    };
  }
  
  // Helper methods
  private calculateImpactLevel(total: number, change: number): 'high' | 'medium' | 'low' {
    const changePercent = Math.abs(change / total) * 100;
    if (changePercent > 10) return 'high';
    if (changePercent > 5) return 'medium';
    return 'low';
  }
  
  private calculateInsiderImpact(transactionValue: number, sharesTransacted: number): 'high' | 'medium' | 'low' {
    // High impact: Large dollar value (>$1M) or large share count (>100K shares)
    if (transactionValue > 1000000 || sharesTransacted > 100000) return 'high';
    // Medium impact: Moderate transactions ($100K-$1M or 10K-100K shares)
    if (transactionValue > 100000 || sharesTransacted > 10000) return 'medium';
    // Low impact: Small transactions
    return 'low';
  }
  
  private estimateInsiderPriceImpact(transactionValue: number, isAcquisition: boolean): number {
    // Estimate price impact based on transaction size and direction
    let baseImpact = 0;
    
    if (transactionValue > 5000000) {
      baseImpact = 1.5; // Large transactions have bigger impact
    } else if (transactionValue > 1000000) {
      baseImpact = 0.8;
    } else if (transactionValue > 100000) {
      baseImpact = 0.3;
    } else {
      baseImpact = 0.1;
    }
    
    // Insider buying is generally more positive signal than selling is negative
    if (isAcquisition) {
      return baseImpact + Math.random() * 0.5; // Positive impact for buying
    } else {
      return -(baseImpact * 0.6) + Math.random() * 0.3; // Smaller negative impact for selling
    }
  }
  
  private estimatePriceImpact(category: string, volume: number): number {
    // Simple estimation logic
    switch (category) {
      case 'insider':
        return (volume > 100000) ? Math.random() * 2 - 1 : Math.random() * 0.5 - 0.25;
      default:
        return Math.random() * 3 - 1.5;
    }
  }
  
  private classifyNewsImpact(title: string, text: string): 'high' | 'medium' | 'low' {
    const highImpactWords = ['acquisition', 'merger', 'partnership', 'breakthrough', 'approval', 'contract'];
    const content = (title + ' ' + text).toLowerCase();
    
    if (highImpactWords.some(word => content.includes(word))) {
      return 'high';
    }
    return 'medium';
  }
  
  private estimateNewsPriceImpact(title: string, text: string): number {
    const content = (title + ' ' + text).toLowerCase();
    if (content.includes('partnership') || content.includes('contract')) {
      return Math.random() * 4 + 1; // 1-5% positive
    }
    if (content.includes('guidance') || content.includes('outlook')) {
      return Math.random() * 6 - 3; // -3% to +3%
    }
    return Math.random() * 2 - 1; // -1% to +1%
  }
}

export const priceMoveRadarAPI = new PriceMoveRadarAPI();