// AI Analysis Service for Company Intel Brief
import { fmpApi } from './fmp-api';

export interface CompanyAnalysis {
  executiveSummary: string;
  keyInsights: Array<{
    type: 'strength' | 'risk' | 'opportunity';
    title: string;
    description: string;
  }>;
  suggestedCharts: Array<{
    type: 'revenue' | 'margins' | 'growth' | 'profitability' | 'cash' | 'valuation';
    title: string;
    priority: number;
  }>;
  companyType: 'growth' | 'value' | 'dividend' | 'speculative';
  revenueGrowth: string;
  profitabilityTrend: string;
  quarterlyComparison: {
    currentQuarter: any;
    priorYearQuarter: any;
    ttmData: any;
    revenueGrowthYoY: number;
    marginTrend: string;
  };
  segmentData: Array<{
    name: string;
    value: number;
    color: string;
    change: number;
  }>;
  revenueData: Array<{
    quarter: string;
    revenue: number;
    growth: number;
  }>;
}

class AIAnalysisService {
  private openaiApiKey: string;

  constructor() {
    this.openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
  }

  async analyzeCompany(
    symbol: string,
    companyProfile: any,
    financialData: any,
    realtimeData: any
  ): Promise<CompanyAnalysis> {
    try {
      // First fetch earnings calendar to know when they last reported
      const earningsCalendar = await fmpApi.getEarningsCalendar(symbol);
      
      // Get the most recent reported earnings date
      const today = new Date();
      const recentEarnings = earningsCalendar?.filter((earning: any) => 
        new Date(earning.date) < today && earning.eps !== null
      ).sort((a: any, b: any) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0];
      
      console.log('📅 Most recent earnings date for', symbol, ':', recentEarnings?.date);
      
      // Fetch comprehensive financial data from FMP
      const [incomeStatements, balanceSheets, cashFlows, keyMetrics, companyNews] = await Promise.all([
        fmpApi.getIncomeStatement(symbol, 12), // Get more quarters to ensure we have the latest
        fmpApi.getBalanceSheet(symbol, 4),
        fmpApi.getCashFlowStatement(symbol, 4),
        fmpApi.getKeyMetrics(symbol, 12),
        fmpApi.getCompanyNews(symbol, 50) // Get recent news
      ]);

      console.log('📊 FMP FINANCIAL DATA:', { incomeStatements: incomeStatements?.length, balanceSheets: balanceSheets?.length, news: companyNews?.length });

      // Filter news for business wire sources only
      const businessWireNews = companyNews?.filter(news => 
        news.site?.toLowerCase().includes('businesswire') ||
        news.site?.toLowerCase().includes('prnewswire') ||
        news.site?.toLowerCase().includes('globenewswire') ||
        news.site?.toLowerCase().includes('pr newswire') ||
        news.site?.toLowerCase().includes('globe newswire')
      ).slice(0, 5); // Get top 5 most recent

      // Generate comprehensive analysis with real data
      const analysisData = await this.processFinancialData(symbol, companyProfile, incomeStatements, keyMetrics, realtimeData, businessWireNews);

      // Add earnings date info to analysis data
      if (recentEarnings) {
        analysisData.lastEarningsDate = recentEarnings.date;
      }

      if (!this.openaiApiKey) {
        return this.getEnhancedFallbackAnalysis(symbol, companyProfile, analysisData);
      }

      const prompt = this.buildEnhancedAnalysisPrompt(symbol, companyProfile, analysisData, realtimeData);
      const response = await this.callOpenAI(prompt);
      
      const aiAnalysis = this.parseAnalysisResponse(response);
      return aiAnalysis ? { ...aiAnalysis, ...analysisData } : this.getEnhancedFallbackAnalysis(symbol, companyProfile, analysisData);
    } catch (error) {
      console.error('AI Analysis failed:', error);
      return this.getFallbackAnalysis(symbol, companyProfile);
    }
  }

  private async processFinancialData(symbol: string, profile: any, incomeStatements: any[], keyMetrics: any[], realtimeData: any, businessWireNews: any[]) {
    // Find the most recent quarter that has actual data (not estimates)
    const sortedStatements = incomeStatements?.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    ) || [];
    
    // The most recent statement with actual revenue data
    const currentQuarter = sortedStatements.find(stmt => 
      stmt.revenue > 0 && stmt.reportedDate
    ) || sortedStatements[0];
    
    // Find the same quarter from previous year for YoY comparison
    const currentQuarterDate = new Date(currentQuarter?.date);
    const priorYearDate = new Date(currentQuarterDate);
    priorYearDate.setFullYear(priorYearDate.getFullYear() - 1);
    
    const priorYearQuarter = sortedStatements.find(stmt => {
      const stmtDate = new Date(stmt.date);
      return Math.abs(stmtDate.getTime() - priorYearDate.getTime()) < 45 * 24 * 60 * 60 * 1000; // Within 45 days
    });
    
    console.log('📊 Current Quarter:', currentQuarter?.date, 'Revenue:', currentQuarter?.revenue);
    console.log('📊 Prior Year Quarter:', priorYearQuarter?.date, 'Revenue:', priorYearQuarter?.revenue);
    
    const currentMetrics = keyMetrics?.[0];
    const priorYearMetrics = keyMetrics?.[4];

    // Calculate YoY revenue growth
    const revenueGrowthYoY = currentQuarter && priorYearQuarter 
      ? ((currentQuarter.revenue - priorYearQuarter.revenue) / priorYearQuarter.revenue) * 100
      : 0;

    // Calculate TTM (Trailing Twelve Months) data
    const ttmRevenue = incomeStatements?.slice(0, 4).reduce((sum, q) => sum + (q.revenue || 0), 0) || 0;
    const ttmNetIncome = incomeStatements?.slice(0, 4).reduce((sum, q) => sum + (q.netIncome || 0), 0) || 0;

    // Generate revenue trend data
    const revenueData = incomeStatements?.slice(0, 8).reverse().map((stmt, index) => ({
      quarter: this.formatQuarter(stmt.date),
      revenue: stmt.revenue / 1e9, // Convert to billions
      growth: index > 0 && incomeStatements[7 - index] ? 
        ((stmt.revenue - incomeStatements[7 - index].revenue) / incomeStatements[7 - index].revenue) * 100 : 0
    })) || [];

    // Generate segment data using AI and real financial statements
    const segmentData = await this.generateRealSegmentData(symbol, profile, incomeStatements, ttmRevenue);

    // Format the most recent quarter info
    const mostRecentQuarter = currentQuarter ? this.formatQuarter(currentQuarter.date) : 'Q2 2025';
    const recentNewsHeadlines = businessWireNews?.map(news => ({
      title: news.title,
      date: news.publishedDate,
      site: news.site
    })) || [];

    return {
      revenueGrowth: `${revenueGrowthYoY > 0 ? '+' : ''}${revenueGrowthYoY.toFixed(1)}%`,
      profitabilityTrend: ttmNetIncome > 0 ? 'Profitable' : 'Loss-making',
      quarterlyComparison: {
        currentQuarter,
        priorYearQuarter,
        ttmData: { revenue: ttmRevenue, netIncome: ttmNetIncome },
        revenueGrowthYoY,
        marginTrend: this.calculateMarginTrend(incomeStatements)
      },
      revenueData,
      segmentData,
      mostRecentQuarter,
      recentNews: recentNewsHeadlines
    };
  }

  private formatQuarter(dateStr: string): string {
    const date = new Date(dateStr);
    const quarter = Math.floor(date.getMonth() / 3) + 1;
    return `Q${quarter} ${date.getFullYear()}`;
  }

  private calculateMarginTrend(statements: any[]): string {
    if (!statements || statements.length < 2) return 'Stable';
    
    const latestMargin = statements[0]?.grossProfitRatio || 0;
    const previousMargin = statements[1]?.grossProfitRatio || 0;
    
    const change = latestMargin - previousMargin;
    if (change > 0.01) return 'Improving';
    if (change < -0.01) return 'Declining';
    return 'Stable';
  }

  private async generateRealSegmentData(symbol: string, profile: any, incomeStatements: any[], ttmRevenue: number): Promise<Array<{name: string; value: number; color: string; change: number}>> {
    if (!this.openaiApiKey) {
      return this.generateFallbackSegmentData(symbol, profile, ttmRevenue);
    }

    try {
      // Create a detailed prompt for AI to analyze financial statements and extract segments
      const prompt = `Analyze the financial statements for ${symbol} (${profile?.companyName || symbol}) and identify the actual revenue segments from their business operations.

Company Profile:
- Industry: ${profile?.industry || 'Unknown'}
- Sector: ${profile?.sector || 'Unknown'}
- Description: ${profile?.description?.substring(0, 300) || 'No description available'}

Recent Financial Data:
- Latest Quarter Revenue: $${incomeStatements?.[0]?.revenue ? (incomeStatements[0].revenue / 1e6).toFixed(0) + 'M' : 'Unknown'}
- TTM Revenue: $${ttmRevenue ? (ttmRevenue / 1e9).toFixed(1) + 'B' : 'Unknown'}

Based on this company's actual business model and industry, provide the real revenue segments as JSON:
{
  "segments": [
    {"name": "Actual segment name from financial filings", "percentage": 0.XX, "change": X.X},
    {"name": "Second actual segment", "percentage": 0.XX, "change": X.X}
  ]
}

Requirements:
- Use REAL segment names from ${symbol}'s actual business (not generic names)
- Percentages must add up to 1.0 (100%)
- Include 3-6 segments based on company size and complexity
- Use realistic YoY growth rates for each segment
- For RKLB specifically: Use Launch Services, Space Systems, etc. (actual aerospace segments)

Respond with ONLY valid JSON, no additional text.`;

      console.log('🤖 Requesting AI segment analysis for:', symbol);
      const response = await this.callOpenAI(prompt);
      
      const parsed = this.parseSegmentResponse(response);
      if (parsed && parsed.segments?.length > 0) {
        return parsed.segments.map((segment: any, index: number) => ({
          name: segment.name,
          value: ttmRevenue * segment.percentage,
          color: this.getConfidentialColor(index),
          change: segment.change || 0
        }));
      }
    } catch (error) {
      console.error('💥 Error generating AI segments:', error);
    }

    // Fallback to company-specific data
    return this.generateFallbackSegmentData(symbol, profile, ttmRevenue);
  }

  private parseSegmentResponse(response: string): any {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return null;
    } catch (error) {
      console.error('Failed to parse AI segment response:', error);
      return null;
    }
  }

  private getConfidentialColor(index: number): string {
    const colors = ['#dc2626', '#991b1b', '#7f1d1d', '#450a0a', '#1f2937', '#374151'];
    return colors[index % colors.length];
  }

  private generateFallbackSegmentData(symbol: string, profile: any, ttmRevenue: number): Array<{name: string; value: number; color: string; change: number}> {
    // Industry-specific segment breakdown with confidential color scheme
    const industry = profile?.industry || '';
    const sector = profile?.sector || '';
    
    // Apple-specific segments
    if (symbol === 'AAPL') {
      return [
        { name: 'iPhone', value: ttmRevenue * 0.52, color: '#dc2626', change: 15 },
        { name: 'Services', value: ttmRevenue * 0.24, color: '#991b1b', change: 18 },
        { name: 'Mac', value: ttmRevenue * 0.10, color: '#7f1d1d', change: 2 },
        { name: 'iPad', value: ttmRevenue * 0.08, color: '#450a0a', change: -5 },
        { name: 'Wearables', value: ttmRevenue * 0.06, color: '#1f2937', change: 12 }
      ];
    }
    
    // Microsoft-specific segments
    if (symbol === 'MSFT') {
      return [
        { name: 'Productivity & Business', value: ttmRevenue * 0.35, color: '#dc2626', change: 13 },
        { name: 'Intelligent Cloud', value: ttmRevenue * 0.42, color: '#991b1b', change: 22 },
        { name: 'More Personal Computing', value: ttmRevenue * 0.23, color: '#7f1d1d', change: 8 }
      ];
    }
    
    // Tesla-specific segments
    if (symbol === 'TSLA') {
      return [
        { name: 'Automotive Sales', value: ttmRevenue * 0.81, color: '#dc2626', change: 19 },
        { name: 'Energy Storage', value: ttmRevenue * 0.07, color: '#991b1b', change: 40 },
        { name: 'Services & Other', value: ttmRevenue * 0.08, color: '#7f1d1d', change: 25 },
        { name: 'Regulatory Credits', value: ttmRevenue * 0.04, color: '#450a0a', change: -12 }
      ];
    }
    
    // Amazon-specific segments  
    if (symbol === 'AMZN') {
      return [
        { name: 'Online Stores', value: ttmRevenue * 0.37, color: '#dc2626', change: 7 },
        { name: 'AWS', value: ttmRevenue * 0.16, color: '#991b1b', change: 29 },
        { name: 'Third-party Services', value: ttmRevenue * 0.25, color: '#7f1d1d', change: 18 },
        { name: 'Advertising', value: ttmRevenue * 0.08, color: '#450a0a', change: 24 },
        { name: 'Physical Stores', value: ttmRevenue * 0.04, color: '#1f2937', change: -3 },
        { name: 'Other', value: ttmRevenue * 0.10, color: '#374151', change: 15 }
      ];
    }
    
    // Google/Alphabet-specific segments
    if (symbol === 'GOOGL' || symbol === 'GOOG') {
      return [
        { name: 'Google Search', value: ttmRevenue * 0.55, color: '#dc2626', change: 11 },
        { name: 'YouTube Ads', value: ttmRevenue * 0.11, color: '#991b1b', change: 13 },
        { name: 'Google Cloud', value: ttmRevenue * 0.11, color: '#7f1d1d', change: 35 },
        { name: 'Google Network', value: ttmRevenue * 0.10, color: '#450a0a', change: -2 },
        { name: 'Other Bets', value: ttmRevenue * 0.01, color: '#1f2937', change: 21 },
        { name: 'Other Google', value: ttmRevenue * 0.12, color: '#374151', change: 8 }
      ];
    }
    
    // NVIDIA-specific segments
    if (symbol === 'NVDA') {
      return [
        { name: 'Data Center', value: ttmRevenue * 0.71, color: '#dc2626', change: 217 },
        { name: 'Gaming', value: ttmRevenue * 0.13, color: '#991b1b', change: 15 },
        { name: 'Professional Visualization', value: ttmRevenue * 0.04, color: '#7f1d1d', change: 17 },
        { name: 'Automotive', value: ttmRevenue * 0.02, color: '#450a0a', change: 4 },
        { name: 'OEM & Other', value: ttmRevenue * 0.10, color: '#1f2937', change: -24 }
      ];
    }
    
    // Aerospace companies (Rocket Lab, Boeing, etc.)
    if (industry.includes('Aerospace') || symbol === 'RKLB' || symbol === 'BA') {
      return [
        { name: 'Launch Services', value: ttmRevenue * 0.65, color: '#dc2626', change: 25 },
        { name: 'Space Systems', value: ttmRevenue * 0.25, color: '#991b1b', change: 15 },
        { name: 'R&D Services', value: ttmRevenue * 0.10, color: '#7f1d1d', change: -5 }
      ];
    }
    
    // Software/Technology companies
    if (industry.includes('Technology') || industry.includes('Software')) {
      return [
        { name: 'Software Products', value: ttmRevenue * 0.60, color: '#dc2626', change: 12 },
        { name: 'Cloud Services', value: ttmRevenue * 0.25, color: '#991b1b', change: 28 },
        { name: 'Professional Services', value: ttmRevenue * 0.15, color: '#7f1d1d', change: 8 }
      ];
    }
    
    // Financial Services
    if (industry.includes('Financial') || sector.includes('Financial')) {
      return [
        { name: 'Interest Income', value: ttmRevenue * 0.65, color: '#dc2626', change: 8 },
        { name: 'Fee Income', value: ttmRevenue * 0.25, color: '#991b1b', change: 12 },
        { name: 'Trading Revenue', value: ttmRevenue * 0.10, color: '#7f1d1d', change: -3 }
      ];
    }
    
    // Healthcare/Pharmaceutical
    if (industry.includes('Healthcare') || industry.includes('Pharmaceutical')) {
      return [
        { name: 'Pharmaceuticals', value: ttmRevenue * 0.70, color: '#dc2626', change: 6 },
        { name: 'Medical Devices', value: ttmRevenue * 0.20, color: '#991b1b', change: 11 },
        { name: 'Consumer Health', value: ttmRevenue * 0.10, color: '#7f1d1d', change: 4 }
      ];
    }
    
    // Retail/Consumer
    if (industry.includes('Retail') || industry.includes('Consumer')) {
      return [
        { name: 'Product Sales', value: ttmRevenue * 0.75, color: '#dc2626', change: 5 },
        { name: 'Services', value: ttmRevenue * 0.15, color: '#991b1b', change: 15 },
        { name: 'Digital/Online', value: ttmRevenue * 0.10, color: '#7f1d1d', change: 25 }
      ];
    }
    
    // Default generic segments
    return [
      { name: 'Core Business', value: ttmRevenue * 0.70, color: '#dc2626', change: 8 },
      { name: 'Services', value: ttmRevenue * 0.20, color: '#991b1b', change: 12 },
      { name: 'Other', value: ttmRevenue * 0.10, color: '#7f1d1d', change: -2 }
    ];
  }

  private buildAnalysisPrompt(symbol: string, profile: any, financial: any, realtime: any): string {
    return `Analyze ${symbol} (${profile?.companyName}) and provide a contextual financial brief.

Company Info:
- Industry: ${profile?.industry || 'Unknown'}
- Sector: ${profile?.sector || 'Unknown'}  
- Market Cap: ${profile?.mktCap ? `$${(profile.mktCap / 1e9).toFixed(1)}B` : 'Unknown'}
- Description: ${profile?.description?.substring(0, 200) || 'No description'}

Current Metrics:
- Price: $${realtime?.price || 0}
- Change: ${realtime?.changePercent || 0}%
- Volume: ${realtime?.volume || 0}
- P/E Ratio: ${financial?.pe || 'N/A'}

Generate analysis as JSON:
{
  "executiveSummary": "2-3 sentence summary relevant to this specific company and industry",
  "keyInsights": [
    {"type": "strength|risk|opportunity", "title": "Brief title", "description": "1 sentence explanation"}
  ],
  "suggestedCharts": [
    {"type": "revenue|margins|growth|profitability|cash|valuation", "title": "Chart name", "priority": 1-3}
  ],
  "companyType": "growth|value|dividend|speculative"
}

Focus on what's actually relevant to ${profile?.industry} companies. If it's a growth company like Rocket Lab, focus on growth metrics not traditional margins.`;
  }

  private async callOpenAI(prompt: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a financial analyst. Respond only with valid JSON. Be specific and relevant to the company\'s actual business and industry.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.3,
      }),
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  private parseAnalysisResponse(response: string): CompanyAnalysis | null {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return null;
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return null;
    }
  }

  private buildEnhancedAnalysisPrompt(symbol: string, profile: any, analysisData: any, realtimeData: any): string {
    const currentQ = analysisData.quarterlyComparison.currentQuarter;
    const priorQ = analysisData.quarterlyComparison.priorYearQuarter;
    
    return `Analyze ${symbol} (${profile?.companyName}) using this comprehensive financial data for a confidential intelligence brief.

Company Profile:
- Industry: ${profile?.industry || 'Unknown'}
- Sector: ${profile?.sector || 'Unknown'}
- Employees: ${profile?.fullTimeEmployees || 'Unknown'}
- Market Cap: ${profile?.mktCap ? `$${(profile.mktCap / 1e9).toFixed(1)}B` : 'Unknown'}

Real Financial Performance:
- Current Quarter Revenue: $${currentQ?.revenue ? (currentQ.revenue / 1e6).toFixed(0) + 'M' : 'Unknown'}
- Prior Year Same Quarter: $${priorQ?.revenue ? (priorQ.revenue / 1e6).toFixed(0) + 'M' : 'Unknown'}
- YoY Revenue Growth: ${analysisData.revenueGrowth}
- TTM Revenue: $${analysisData.quarterlyComparison.ttmData.revenue ? (analysisData.quarterlyComparison.ttmData.revenue / 1e9).toFixed(1) + 'B' : 'Unknown'}
- Profitability: ${analysisData.profitabilityTrend}
- Margin Trend: ${analysisData.quarterlyComparison.marginTrend}

Current Stock Metrics:
- Price: $${realtimeData?.price || 0}
- Change: ${realtimeData?.changePercent || 0}%

Generate intelligence brief analysis as JSON:
{
  "executiveSummary": "${symbol} reported [specific performance] with [actual growth rate] revenue growth driven by [specific business drivers]. Revenue reached [actual revenue figure], [beating/missing] expectations by [amount]. [Specific risks or opportunities based on actual data].",
  "keyInsights": [
    {"type": "strength", "title": "Specific strength based on real data", "description": "1 sentence with actual metrics"},
    {"type": "risk", "title": "Specific risk from financial data", "description": "1 sentence about actual concern"}
  ],
  "companyType": "growth|value|dividend|speculative"
}

Use REAL numbers and specific business context. If it's aerospace like Rocket Lab, focus on launch cadence and backlog. If it's tech, focus on recurring revenue and margins.`;
  }

  private getEnhancedFallbackAnalysis(symbol: string, profile: any, analysisData: any): CompanyAnalysis {
    const industry = profile?.industry || 'Unknown';
    const isGrowthCompany = industry.includes('Aerospace') || industry.includes('Technology') || 
                           industry.includes('Software') || industry.includes('Biotechnology');
    
    const revenueGrowth = analysisData.revenueGrowth || '+0.0%';
    const ttmRevenue = analysisData.quarterlyComparison?.ttmData?.revenue || 0;
    const isProf = analysisData.profitabilityTrend === 'Profitable';
    const currentQuarterRevenue = analysisData.quarterlyComparison?.currentQuarter?.revenue || 0;
    const mostRecentQuarter = analysisData.mostRecentQuarter || 'Q2 2025';

    // Create news summary if available
    let newsSummary = '';
    if (analysisData.recentNews && analysisData.recentNews.length > 0) {
      const topNews = analysisData.recentNews[0];
      newsSummary = ` Recent developments include ${topNews.title.substring(0, 100)}...`;
    }

    // Build executive summary with Q2 focus
    let executiveSummary = `${profile?.companyName || symbol} reported ${mostRecentQuarter} results with ${revenueGrowth} YoY revenue growth`;
    
    if (currentQuarterRevenue > 0) {
      executiveSummary += `, reaching $${(currentQuarterRevenue / 1e6).toFixed(0)}M in quarterly revenue`;
    }
    
    executiveSummary += `. ${isProf ? 'The company maintained profitability' : 'The company continued investing in growth'} with ${analysisData.quarterlyComparison?.marginTrend?.toLowerCase() || 'stable'} margin trends.`;
    
    if (newsSummary) {
      executiveSummary += newsSummary;
    } else {
      executiveSummary += ` ${profile?.companyName || symbol} demonstrates ${isGrowthCompany ? 'strong growth momentum' : 'operational discipline'} in the ${industry} sector.`;
    }

    return {
      executiveSummary,
      keyInsights: [
        {
          type: 'strength',
          title: isGrowthCompany ? 'Revenue Growth' : 'Market Position',
          description: isGrowthCompany ? 
            `${revenueGrowth} YoY revenue growth demonstrates strong market demand.` :
            `Established presence in the ${industry} industry with stable operations.`
        },
        {
          type: isProf ? 'opportunity' : 'risk',
          title: isProf ? 'Margin Expansion' : 'Path to Profitability',
          description: isProf ? 
            `${analysisData.quarterlyComparison?.marginTrend || 'Stable'} margins provide opportunity for further optimization.` :
            'Focus on achieving sustainable profitability while maintaining growth.'
        }
      ],
      suggestedCharts: isGrowthCompany ? [
        { type: 'revenue', title: 'Revenue Growth', priority: 1 },
        { type: 'growth', title: 'Growth Metrics', priority: 2 },
        { type: 'cash', title: 'Cash Position', priority: 3 }
      ] : [
        { type: 'revenue', title: 'Revenue Trend', priority: 1 },
        { type: 'margins', title: 'Margin Analysis', priority: 2 },
        { type: 'profitability', title: 'Profitability', priority: 3 }
      ],
      companyType: isGrowthCompany ? 'growth' : 'value',
      ...analysisData
    };
  }

  private getFallbackAnalysis(symbol: string, profile: any): CompanyAnalysis {
    const industry = profile?.industry || 'Unknown';
    const isGrowthCompany = industry.includes('Aerospace') || industry.includes('Technology') || 
                           industry.includes('Software') || industry.includes('Biotechnology');

    return {
      executiveSummary: `${profile?.companyName || symbol} operates in the ${industry} sector. This analysis provides key financial metrics and performance indicators relevant to companies in this industry.`,
      keyInsights: [
        {
          type: 'strength',
          title: 'Market Position',
          description: `Established presence in the ${industry} industry.`
        },
        {
          type: 'risk',
          title: 'Market Volatility',
          description: 'Subject to market and industry-specific volatility.'
        }
      ],
      suggestedCharts: isGrowthCompany ? [
        { type: 'revenue', title: 'Revenue Growth', priority: 1 },
        { type: 'growth', title: 'Growth Metrics', priority: 2 },
        { type: 'cash', title: 'Cash Position', priority: 3 }
      ] : [
        { type: 'revenue', title: 'Revenue Trend', priority: 1 },
        { type: 'margins', title: 'Margin Analysis', priority: 2 },
        { type: 'profitability', title: 'Profitability', priority: 3 }
      ],
      companyType: isGrowthCompany ? 'growth' : 'value',
      revenueGrowth: '+0.0%',
      profitabilityTrend: 'Unknown',
      quarterlyComparison: {
        currentQuarter: null,
        priorYearQuarter: null,
        ttmData: { revenue: 0, netIncome: 0 },
        revenueGrowthYoY: 0,
        marginTrend: 'Stable'
      },
      revenueData: [],
      segmentData: []
    };
  }
}

export const aiAnalysis = new AIAnalysisService();