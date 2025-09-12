// Benzinga API Service for Analyst Data
// Integration for analyst names, targets, and firms

export interface BenzingaAnalystRating {
  id: string;
  date: string;
  time: string;
  ticker: string;
  exchange: string;
  name: string;
  action_pt: string;
  action_company: string;
  rating_current: string;
  rating_prior: string;
  pt_current: number;
  pt_prior: number;
  analyst: string;
  analyst_name: string;
  firm: string;
  importance: number;
  notes: string;
  url_calendar: string;
  url_news: string;
  currency: string;
  updated: number;
}

export interface BenzingaAnalyst {
  analyst_id: string;
  analyst_name: string;
  firm: string;
  firm_id: string;
  accuracy_overall: number;
  accuracy_one_year: number;
  total_ratings: number;
  successful_ratings: number;
  smart_score: number;
}

export interface BenzingaAnalystConsensus {
  ticker: string;
  exchange: string;
  name: string;
  ratings: {
    strong_buy: number;
    buy: number;
    hold: number;
    underperform: number;
    sell: number;
    strong_sell: number;
  };
  pt_current: number;
  pt_high: number;
  pt_low: number;
  pt_mean: number;
  updated: number;
}

class BenzingaApiService {
  private baseUrl = 'https://api.benzinga.com/api/v2.1';
  private apiKey: string;

  constructor() {
    // Use environment variable - you'll need to add this to .env.local
    this.apiKey = import.meta.env.VITE_BENZINGA_API_KEY || 'demo_key';
  }

  private async fetchWithRetry(url: string, retries = 3): Promise<any> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(`${url}&token=${this.apiKey}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        return data;
      } catch (error) {
        console.warn(`Benzinga API attempt ${i + 1} failed:`, error);
        
        if (i === retries - 1) {
          throw error;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  async getAnalystRatings(symbol: string, limit = 50): Promise<BenzingaAnalystRating[]> {
    const url = `${this.baseUrl}/calendar/ratings?symbols=${symbol}&limit=${limit}&sort_by=date&sort_order=desc`;
    console.log(`📊 [BENZINGA-API] Fetching analyst ratings for ${symbol}`);
    
    try {
      const data = await this.fetchWithRetry(url);
      return data.ratings || [];
    } catch (error) {
      console.error('💥 Benzinga analyst ratings error:', error);
      return [];
    }
  }

  async getAnalystDetails(analystId?: string, firm?: string): Promise<BenzingaAnalyst[]> {
    let url = `${this.baseUrl}/calendar/analyst`;
    const params = [];
    
    if (analystId) params.push(`analyst_id=${analystId}`);
    if (firm) params.push(`firm=${encodeURIComponent(firm)}`);
    
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }

    try {
      const data = await this.fetchWithRetry(url);
      return data.analysts || [];
    } catch (error) {
      console.error('💥 Benzinga analyst details error:', error);
      return [];
    }
  }

  async getAnalystConsensus(symbol: string): Promise<BenzingaAnalystConsensus | null> {
    const url = `${this.baseUrl}/calendar/consensus?symbols=${symbol}`;
    
    try {
      const data = await this.fetchWithRetry(url);
      return data.consensus?.[0] || null;
    } catch (error) {
      console.error('💥 Benzinga consensus error:', error);
      return null;
    }
  }

  async getTopAnalysts(limit = 20): Promise<BenzingaAnalyst[]> {
    const url = `${this.baseUrl}/calendar/analyst?limit=${limit}&sort_by=accuracy_overall&sort_order=desc`;
    
    try {
      const data = await this.fetchWithRetry(url);
      return data.analysts || [];
    } catch (error) {
      console.error('💥 Benzinga top analysts error:', error);
      return [];
    }
  }

  async getAnalystRatingHistory(symbol: string, analystId?: string, days = 90): Promise<BenzingaAnalystRating[]> {
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = new Date().toISOString().split('T')[0];
    
    let url = `${this.baseUrl}/calendar/ratings?symbols=${symbol}&date_from=${fromDate}&date_to=${toDate}&sort_by=date&sort_order=desc`;
    
    if (analystId) {
      url += `&analyst_id=${analystId}`;
    }
    
    try {
      const data = await this.fetchWithRetry(url);
      return data.ratings || [];
    } catch (error) {
      console.error('💥 Benzinga rating history error:', error);
      return [];
    }
  }

  // Get analyst performance metrics
  async getAnalystAccuracy(analystId: string): Promise<any> {
    const url = `${this.baseUrl}/calendar/analyst?analyst_id=${analystId}`;
    
    try {
      const data = await this.fetchWithRetry(url);
      return data.analysts?.[0] || null;
    } catch (error) {
      console.error('💥 Benzinga analyst accuracy error:', error);
      return null;
    }
  }
}

export const benzingaApi = new BenzingaApiService();