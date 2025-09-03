// FMP API Service for BusinessOS
// Financial Modeling Prep API integration

export interface CompanyProfile {
  symbol: string;
  price: number;
  beta: number;
  volAvg: number;
  mktCap: number;
  lastDiv: number;
  range: string;
  changes: number;
  companyName: string;
  currency: string;
  cik: string;
  isin: string;
  cusip: string;
  exchange: string;
  exchangeShortName: string;
  industry: string;
  website: string;
  description: string;
  ceo: string;
  sector: string;
  country: string;
  fullTimeEmployees: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  dcfDiff: number;
  dcf: number;
  image: string;
}

export interface CompanyQuote {
  symbol: string;
  name: string;
  price: number;
  changesPercentage: number;
  change: number;
  dayLow: number;
  dayHigh: number;
  yearHigh: number;
  yearLow: number;
  marketCap: number;
  priceAvg50: number;
  priceAvg200: number;
  exchange: string;
  volume: number;
  avgVolume: number;
  open: number;
  previousClose: number;
  eps: number;
  pe: number;
  earningsAnnouncement: string;
  sharesOutstanding: number;
  timestamp: number;
}

export interface CompanySearch {
  symbol: string;
  name: string;
  currency: string;
  stockExchange: string;
  exchangeShortName?: string; // Optional since API doesn't always return this
}

export interface FinancialRatios {
  symbol: string;
  date: string;
  calendarYear: string;
  period: string;
  currentRatio: number;
  quickRatio: number;
  cashRatio: number;
  daysOfSalesOutstanding: number;
  daysOfInventoryOutstanding: number;
  operatingCycle: number;
  daysOfPayablesOutstanding: number;
  cashConversionCycle: number;
  grossProfitMargin: number;
  operatingProfitMargin: number;
  pretaxProfitMargin: number;
  netProfitMargin: number;
  effectiveTaxRate: number;
  returnOnAssets: number;
  returnOnEquity: number;
  returnOnCapitalEmployed: number;
  netIncomePerEBT: number;
  ebtPerEbit: number;
  ebitPerRevenue: number;
  debtRatio: number;
  debtEquityRatio: number;
  longTermDebtToCapitalization: number;
  totalDebtToCapitalization: number;
  interestCoverage: number;
  cashFlowToDebtRatio: number;
  companyEquityMultiplier: number;
  receivablesTurnover: number;
  payablesTurnover: number;
  inventoryTurnover: number;
  fixedAssetTurnover: number;
  assetTurnover: number;
  operatingCashFlowPerShare: number;
  freeCashFlowPerShare: number;
  cashPerShare: number;
  payoutRatio: number;
  operatingCashFlowSalesRatio: number;
  freeCashFlowOperatingCashFlowRatio: number;
  cashFlowCoverageRatios: number;
  shortTermCoverageRatios: number;
  capitalExpenditureCoverageRatio: number;
  dividendPaidAndCapexCoverageRatio: number;
  dividendPayoutRatio: number;
  priceBookValueRatio: number;
  priceToBookRatio: number;
  priceToSalesRatio: number;
  priceEarningsRatio: number;
  priceToFreeCashFlowsRatio: number;
  priceToOperatingCashFlowsRatio: number;
  priceCashFlowRatio: number;
  priceEarningsToGrowthRatio: number;
  priceSalesRatio: number;
  dividendYield: number;
  enterpriseValueMultiple: number;
  priceFairValue: number;
}

class FMPApiService {
  private baseUrl = 'https://financialmodelingprep.com/api/v3';
  private apiKey: string;

  constructor() {
    // In production, this should come from environment variables
    this.apiKey = 'QLmCqVKpw5uZHM6sFs69VSSDDlU3xiPy';
  }

  private async fetchWithRetry(url: string, retries = 3): Promise<any> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(`${url}&apikey=${this.apiKey}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Check for FMP API errors
        if (data.error || (Array.isArray(data) && data.length === 0)) {
          throw new Error(data.error || 'No data found');
        }
        
        return data;
      } catch (error) {
        console.warn(`FMP API attempt ${i + 1} failed:`, error);
        
        if (i === retries - 1) {
          throw error;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  async searchCompanies(query: string): Promise<CompanySearch[]> {
    if (!query || query.length < 1) return [];
    
    const url = `${this.baseUrl}/search?query=${encodeURIComponent(query)}&limit=20&exchange=NASDAQ,NYSE`;
    console.log('FMP API URL:', url);
    const results = await this.fetchWithRetry(url);
    console.log('FMP API raw results:', results);
    return results;
  }

  async getCompanyProfile(symbol: string): Promise<CompanyProfile> {
    const url = `${this.baseUrl}/profile/${symbol}`;
    const data = await this.fetchWithRetry(url);
    return Array.isArray(data) ? data[0] : data;
  }

  async getCompanyQuote(symbol: string): Promise<CompanyQuote> {
    const url = `${this.baseUrl}/quote/${symbol}`;
    const data = await this.fetchWithRetry(url);
    return Array.isArray(data) ? data[0] : data;
  }

  async getFinancialRatios(symbol: string, limit = 4): Promise<FinancialRatios[]> {
    const url = `${this.baseUrl}/ratios/${symbol}?limit=${limit}`;
    return this.fetchWithRetry(url);
  }

  async getHistoricalPrices(symbol: string, from?: string, to?: string): Promise<any[]> {
    const fromDate = from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const toDate = to || new Date().toISOString().split('T')[0];
    
    const url = `${this.baseUrl}/historical-price-full/${symbol}?from=${fromDate}&to=${toDate}`;
    const data = await this.fetchWithRetry(url);
    return data.historical || [];
  }

  async getMarketNews(symbol?: string, limit = 20): Promise<any[]> {
    const url = symbol 
      ? `${this.baseUrl}/stock_news?tickers=${symbol}&limit=${limit}`
      : `${this.baseUrl}/stock_news?limit=${limit}`;
    return this.fetchWithRetry(url);
  }

  async getEarningsCalendar(symbol?: string): Promise<any[]> {
    const url = symbol 
      ? `${this.baseUrl}/earning_calendar?symbol=${symbol}`
      : `${this.baseUrl}/earning_calendar`;
    return this.fetchWithRetry(url);
  }
}

export const fmpApi = new FMPApiService();