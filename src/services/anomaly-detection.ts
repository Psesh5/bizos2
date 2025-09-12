// Beta-Adjusted Anomaly Detection Service
// Detects company-specific vs market-wide events

import { fmpApi, CompanyProfile } from './fmp-api';

export interface AnomalyEvent {
  id: string;
  date: string;
  type: 'company-specific' | 'market-correlated' | 'hybrid';
  severity: 'high' | 'medium' | 'low';
  sequence: string;
  description: string;
  position: number;
  
  // Financial data
  stockReturn: number;
  marketReturn: number;
  expectedReturn: number;
  residualReturn: number;
  beta: number;
  zScore: number;
  
  // Display data
  gainLoss: string;
  close: string;
  newsLink: string;
  confidence: number;
}

export interface MarketData {
  date: string;
  close: number;
  volume: number;
  return: number;
}

class AnomalyDetectionService {
  
  // Get SPY data as market benchmark
  async getMarketData(days: number = 90): Promise<MarketData[]> {
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const spyData = await fmpApi.getHistoricalPrices('SPY', fromDate);
    
    return spyData.map((day, index) => {
      const prevClose = spyData[index + 1]?.close || day.close;
      return {
        date: day.date,
        close: day.close,
        volume: day.volume,
        return: ((day.close - prevClose) / prevClose) * 100
      };
    }).slice(0, -1); // Remove last item (no previous close)
  }
  
  // Get stock data with returns
  async getStockData(symbol: string, days: number = 90): Promise<MarketData[]> {
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const stockData = await fmpApi.getHistoricalPrices(symbol, fromDate);
    
    return stockData.map((day, index) => {
      const prevClose = stockData[index + 1]?.close || day.close;
      return {
        date: day.date,
        close: day.close,
        volume: day.volume,
        return: ((day.close - prevClose) / prevClose) * 100
      };
    }).slice(0, -1);
  }
  
  // Calculate beta from historical data
  calculateBeta(stockReturns: number[], marketReturns: number[]): number {
    if (stockReturns.length !== marketReturns.length || stockReturns.length < 20) {
      return 1.0; // Default beta if insufficient data
    }
    
    const n = stockReturns.length;
    const meanStock = stockReturns.reduce((a, b) => a + b) / n;
    const meanMarket = marketReturns.reduce((a, b) => a + b) / n;
    
    let covariance = 0;
    let marketVariance = 0;
    
    for (let i = 0; i < n; i++) {
      const stockDeviation = stockReturns[i] - meanStock;
      const marketDeviation = marketReturns[i] - meanMarket;
      covariance += stockDeviation * marketDeviation;
      marketVariance += marketDeviation * marketDeviation;
    }
    
    return marketVariance === 0 ? 1.0 : covariance / marketVariance;
  }
  
  // Generate DNA-like sequence based on anomaly characteristics
  generateSequence(anomaly: {
    stockReturn: number;
    residualReturn: number;
    volume: number;
    severity: string;
  }): string {
    const bases = ['A', 'T', 'C', 'G']; // Adenine, Thymine, Cytosine, Guanine
    let sequence = '';
    
    // First triplet: Stock return direction and magnitude
    if (anomaly.stockReturn > 5) sequence += 'ATG'; // Strong positive
    else if (anomaly.stockReturn > 0) sequence += 'ATC'; // Weak positive
    else if (anomaly.stockReturn < -5) sequence += 'TAC'; // Strong negative
    else sequence += 'TAG'; // Weak negative
    
    sequence += '-';
    
    // Second triplet: Residual return (company-specific component)
    if (Math.abs(anomaly.residualReturn) > 3) sequence += 'GCT'; // High residual
    else if (Math.abs(anomaly.residualReturn) > 1) sequence += 'GCA'; // Medium residual
    else sequence += 'GCG'; // Low residual
    
    sequence += '-';
    
    // Third triplet: Volume anomaly
    if (anomaly.volume > 2) sequence += 'TTAG'; // High volume
    else if (anomaly.volume > 1.5) sequence += 'TCAG'; // Medium volume
    else sequence += 'TGAG'; // Normal volume
    
    return sequence;
  }
  
  // Main anomaly detection function
  async detectAnomalies(symbol: string): Promise<AnomalyEvent[]> {
    try {
      console.log(`🧬 Detecting anomalies for ${symbol}...`);
      
      // Get data
      const [stockData, marketData, profile] = await Promise.all([
        this.getStockData(symbol, 90),
        this.getMarketData(90),
        fmpApi.getCompanyProfile(symbol)
      ]);
      
      if (!stockData.length || !marketData.length) {
        throw new Error('Insufficient data for anomaly detection');
      }
      
      // Align data by date
      const alignedData = stockData
        .map(stock => {
          const market = marketData.find(m => m.date === stock.date);
          return market ? { stock, market } : null;
        })
        .filter(Boolean)
        .slice(0, 60); // Last 60 trading days
      
      const stockReturns = alignedData.map(d => d!.stock.return);
      const marketReturns = alignedData.map(d => d!.market.return);
      
      // Calculate beta
      const beta = profile.beta || this.calculateBeta(stockReturns, marketReturns);
      
      // Calculate residuals and identify anomalies
      const anomalies: AnomalyEvent[] = [];
      let anomalyCount = 0;
      
      alignedData.forEach((data, index) => {
        const { stock, market } = data!;
        const expectedReturn = beta * market.return;
        const residualReturn = stock.return - expectedReturn;
        const absResidual = Math.abs(residualReturn);
        
        // Z-score for residual returns
        const residuals = alignedData.map(d => d!.stock.return - beta * d!.market.return);
        const meanResidual = residuals.reduce((a, b) => a + b) / residuals.length;
        const stdResidual = Math.sqrt(
          residuals.reduce((sum, r) => sum + Math.pow(r - meanResidual, 2), 0) / residuals.length
        );
        const zScore = (residualReturn - meanResidual) / stdResidual;
        
        // Volume ratio
        const avgVolume = alignedData.slice(0, 20).reduce((sum, d) => sum + d!.stock.volume, 0) / 20;
        const volumeRatio = stock.volume / avgVolume;
        
        // Anomaly detection criteria
        const isAnomaly = Math.abs(zScore) > 1.5 || volumeRatio > 2.0;
        
        if (isAnomaly && anomalyCount < 6) {
          anomalyCount++;
          
          // Determine type
          let type: AnomalyEvent['type'] = 'company-specific';
          if (Math.abs(market.return) > 2 && Math.abs(stock.return - expectedReturn) < 1) {
            type = 'market-correlated';
          } else if (Math.abs(market.return) > 1 && absResidual > 2) {
            type = 'hybrid';
          }
          
          // Determine severity
          let severity: AnomalyEvent['severity'] = 'low';
          if (Math.abs(zScore) > 3 || absResidual > 5) severity = 'high';
          else if (Math.abs(zScore) > 2 || absResidual > 3) severity = 'medium';
          
          // Generate description
          const direction = stock.return > 0 ? 'surge' : 'drop';
          const magnitude = Math.abs(stock.return);
          let description = '';
          
          if (type === 'company-specific') {
            description = `Company-specific ${direction} of ${magnitude.toFixed(1)}% (${Math.abs(residualReturn).toFixed(1)}% unexplained)`;
          } else if (type === 'market-correlated') {
            description = `Market-driven ${direction} following ${market.return > 0 ? 'broader rally' : 'market selloff'}`;
          } else {
            description = `Mixed event: ${direction} amplified beyond market movement`;
          }
          
          anomalies.push({
            id: `seq_${String(anomalyCount).padStart(3, '0')}`,
            date: new Date(stock.date).toLocaleDateString(),
            type,
            severity,
            sequence: this.generateSequence({
              stockReturn: stock.return,
              residualReturn,
              volume: volumeRatio,
              severity
            }),
            description,
            position: (index / alignedData.length) * 100,
            stockReturn: stock.return,
            marketReturn: market.return,
            expectedReturn,
            residualReturn,
            beta,
            zScore,
            gainLoss: `${stock.return > 0 ? '+' : ''}${stock.return.toFixed(2)}%`,
            close: stock.close.toFixed(2),
            newsLink: `${stock.date}-Analyzing market events for ${symbol}`,
            confidence: Math.min(95, 60 + Math.abs(zScore) * 10)
          });
        }
      });
      
      console.log(`🧬 Found ${anomalies.length} anomalies for ${symbol}`);
      return anomalies.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
    } catch (error) {
      console.error('🚨 Anomaly detection failed:', error);
      return [];
    }
  }
  
  // Get correlated news for anomaly dates
  async getAnomalyNews(symbol: string, anomalies: AnomalyEvent[]): Promise<AnomalyEvent[]> {
    try {
      const news = await fmpApi.getCompanyNews(symbol, 100);
      
      return anomalies.map(anomaly => {
        // Find news within 1 day of anomaly
        const anomalyDate = new Date(anomaly.date);
        const relevantNews = news.find(article => {
          const newsDate = new Date(article.publishedDate);
          const dayDiff = Math.abs(anomalyDate.getTime() - newsDate.getTime()) / (1000 * 60 * 60 * 24);
          return dayDiff <= 1;
        });
        
        return {
          ...anomaly,
          newsLink: relevantNews ? 
            `${anomaly.date}-${relevantNews.title.substring(0, 50)}...` : 
            `${anomaly.date}-No specific news found for ${symbol} anomaly`
        };
      });
    } catch (error) {
      console.error('News correlation failed:', error);
      return anomalies;
    }
  }
}

export const anomalyDetection = new AnomalyDetectionService();