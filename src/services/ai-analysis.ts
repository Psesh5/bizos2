// AI Analysis Service for Company Intel Brief
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
    if (!this.openaiApiKey) {
      return this.getFallbackAnalysis(symbol, companyProfile);
    }

    try {
      const prompt = this.buildAnalysisPrompt(symbol, companyProfile, financialData, realtimeData);
      const response = await this.callOpenAI(prompt);
      
      return this.parseAnalysisResponse(response) || this.getFallbackAnalysis(symbol, companyProfile);
    } catch (error) {
      console.error('AI Analysis failed:', error);
      return this.getFallbackAnalysis(symbol, companyProfile);
    }
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
      companyType: isGrowthCompany ? 'growth' : 'value'
    };
  }
}

export const aiAnalysis = new AIAnalysisService();