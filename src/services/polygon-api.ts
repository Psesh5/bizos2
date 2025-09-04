// Polygon.io API Service for Real-time Stock Data
export interface PolygonQuote {
  ask_price: number;
  bid_price: number;
  ask_size: number;
  bid_size: number;
  ask_exchange: number;
  bid_exchange: number;
  participant_timestamp: number;
  sip_timestamp: number;
}

export interface PolygonSnapshot {
  ticker: string;
  day: {
    change: number;
    change_percent: number;
    close: number;
    high: number;
    low: number;
    open: number;
    previous_close: number;
    volume: number;
  };
  min: {
    av: number; // average volume
    c: number;  // close
    h: number;  // high
    l: number;  // low
    o: number;  // open
    t: number;  // timestamp
    v: number;  // volume
  };
  prevDay: {
    change: number;
    change_percent: number;
    close: number;
    high: number;
    low: number;
    open: number;
    volume: number;
  };
  market_status: string;
  name: string;
  type: string;
  session: {
    change: number;
    change_percent: number;
    early_trading_change: number;
    early_trading_change_percent: number;
    close: number;
    high: number;
    low: number;
    open: number;
    previous_close: number;
  };
  value: number;
}

export interface PolygonAggregates {
  ticker: string;
  results: Array<{
    c: number; // close
    h: number; // high
    l: number; // low
    n: number; // number of transactions
    o: number; // open
    t: number; // timestamp
    v: number; // volume
    vw: number; // volume weighted average price
  }>;
  resultsCount: number;
  status: string;
}

class PolygonApiService {
  private baseUrl = 'https://api.polygon.io';
  private apiKey: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_POLYGON_API_KEY || '';
  }

  private async fetchWithRetry(url: string, retries = 3): Promise<any> {
    for (let i = 0; i < retries; i++) {
      try {
        const fullUrl = `${url}${url.includes('?') ? '&' : '?'}apikey=${this.apiKey}`;
        console.log('🌐 FULL URL:', fullUrl);
        
        const response = await fetch(fullUrl);
        
        console.log('📡 RESPONSE STATUS:', response.status, response.statusText);
        console.log('📋 RESPONSE HEADERS:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
          if (response.status === 429) {
            // Rate limit - wait longer before retry
            await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
            continue;
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'ERROR') {
          throw new Error(data.error || 'Polygon API error');
        }
        
        return data;
      } catch (error) {
        console.warn(`Polygon API attempt ${i + 1} failed:`, error);
        
        if (i === retries - 1) {
          throw error;
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  // Get real-time stock snapshot with price, volume, etc.
  async getSnapshot(symbol: string): Promise<PolygonSnapshot> {
    const url = `${this.baseUrl}/v3/snapshot?ticker=${symbol}&order=asc&limit=10&sort=ticker`;
    const data = await this.fetchWithRetry(url);
    return data.results?.[0];
  }

  // Get real-time quote data
  async getQuote(symbol: string): Promise<PolygonQuote> {
    const url = `${this.baseUrl}/v3/quotes/${symbol}`;
    const data = await this.fetchWithRetry(url);
    return data.results?.[0];
  }

  // Get ticker details for shares outstanding, market cap, etc.
  async getTickerDetails(symbol: string): Promise<any> {
    const url = `${this.baseUrl}/v3/reference/tickers/${symbol}`;
    const data = await this.fetchWithRetry(url);
    return data.results;
  }

  // Get historical aggregates for charts
  async getAggregates(
    symbol: string, 
    multiplier = 1, 
    timespan: 'minute' | 'hour' | 'day' | 'week' | 'month' = 'day',
    from?: string, 
    to?: string,
    limit = 120
  ): Promise<PolygonAggregates> {
    const fromDate = from || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = to || new Date().toISOString().split('T')[0];
    
    const url = `${this.baseUrl}/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${fromDate}/${toDate}?adjusted=true&sort=asc&limit=${limit}`;
    return this.fetchWithRetry(url);
  }

  // Calculate market cap from real-time price and shares outstanding
  async getMarketCap(symbol: string, sharesOutstanding?: number): Promise<number> {
    try {
      const snapshot = await this.getSnapshot(symbol);
      const currentPrice = snapshot.day?.close || snapshot.min?.c || 0;
      
      if (sharesOutstanding && currentPrice) {
        return currentPrice * sharesOutstanding;
      }
      
      // If no shares outstanding provided, return 0
      return 0;
    } catch (error) {
      console.error(`Error calculating market cap for ${symbol}:`, error);
      return 0;
    }
  }

  // Get real-time P/E ratio (requires EPS data)
  async getPERatio(symbol: string, eps?: number): Promise<number | null> {
    try {
      if (!eps) return null;
      
      const snapshot = await this.getSnapshot(symbol);
      const currentPrice = snapshot.day?.close || snapshot.min?.c || 0;
      
      return eps > 0 ? currentPrice / eps : null;
    } catch (error) {
      console.error(`Error calculating P/E for ${symbol}:`, error);
      return null;
    }
  }

  // Format data for our components
  async getCompanyRealTimeData(symbol: string) {
    try {
      console.log('📸 Fetching market snapshot, ticker details, and historical volume for', symbol);
      
      // Get last 20 trading days for average volume calculation
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      // Fetch snapshot, ticker details, and historical data in parallel
      const [snapshot, tickerDetails, historicalData] = await Promise.all([
        this.getSnapshot(symbol),
        this.getTickerDetails(symbol),
        this.getAggregates(symbol, 1, 'day', startDate, endDate, 20)
      ]);
      
      console.log('📊 Snapshot response:', snapshot);
      console.log('🏢 Ticker details:', tickerDetails);
      console.log('📈 Historical data:', historicalData);
      
      if (!snapshot) {
        console.error(`No snapshot data found for ${symbol}`);
        return null;
      }
      
      // Extract price data from v3 snapshot
      const currentPrice = snapshot.session?.price || snapshot.session?.close || 0;
      const previousClose = snapshot.session?.previous_close || 0;
      const change = snapshot.session?.change || 0;
      const changePercent = snapshot.session?.change_percent || 0;
      const volume = snapshot.session?.volume || 0;
      
      // Calculate average volume from historical data
      let avgVolume = 0;
      if (historicalData?.results && historicalData.results.length > 0) {
        const totalVolume = historicalData.results.reduce((sum: number, day: any) => sum + (day.v || 0), 0);
        avgVolume = totalVolume / historicalData.results.length;
      }
      
      // Determine volume trend vs average
      const volumeVsAvg = avgVolume > 0 ? ((volume - avgVolume) / avgVolume) * 100 : 0;
      
      // Calculate market cap if we have shares outstanding
      const sharesOutstanding = tickerDetails?.share_class_shares_outstanding || tickerDetails?.weighted_shares_outstanding || 0;
      const marketCap = currentPrice * sharesOutstanding;
      
      // Extract additional financial data
      const peRatio = tickerDetails?.price_earnings_ratio || null;
      const dividendYield = tickerDetails?.dividend_yield || null;
      const beta = tickerDetails?.beta || null;
      
      console.log('💰 Extracted - Price:', currentPrice, 'Volume:', volume, 'Avg Volume:', avgVolume, 'Volume vs Avg:', volumeVsAvg.toFixed(1) + '%');
      
      return {
        symbol: snapshot.ticker,
        price: currentPrice,
        change: change,
        changePercent: changePercent,
        volume: volume,
        avgVolume: avgVolume,
        volumeVsAvg: volumeVsAvg,
        previousClose: previousClose,
        high: snapshot.session?.high || 0,
        low: snapshot.session?.low || 0,
        open: snapshot.session?.open || 0,
        marketStatus: snapshot.market_status || 'UNKNOWN',
        marketCap: marketCap,
        peRatio: peRatio,
        dividendYield: dividendYield,
        beta: beta,
        sharesOutstanding: sharesOutstanding,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`Error fetching real-time data for ${symbol}:`, error);
      return null;
    }
  }
}

export const polygonApi = new PolygonApiService();