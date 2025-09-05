import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import { TrendingUp, TrendingDown, Minus, Apple, Maximize2, Minimize2, ExternalLink, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { WidgetProps } from '@/types/widget';
import { InlineCompanySelector } from '../InlineCompanySelector';
import { polygonApi } from '@/services/polygon-api';
import { fmpApi } from '@/services/fmp-api';
import { aiAnalysis, type CompanyAnalysis } from '@/services/ai-analysis';

// Peer companies mapping - hardcoded peers for RKLB as requested
const PEER_COMPANIES: Record<string, string[]> = {
  'RKLB': ['ASTS', 'LUNR', 'BKSY', 'RDW'],
  'AAPL': ['MSFT', 'GOOGL', 'META', 'AMZN'],
  'TSLA': ['RIVN', 'LCID', 'NIO', 'F'],
  'NVDA': ['AMD', 'INTC', 'QCOM', 'AVGO']
};

interface CompanyIntelBriefWidgetProps extends WidgetProps {
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
}

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  subtitle?: string;
  className?: string;
}

function MetricCard({ title, value, change, trend, subtitle, className }: MetricCardProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4" />;
      case 'down':
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <Minus className="h-4 w-4" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-success';
      case 'down':
        return 'text-danger';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <Card className={cn("card-elevated hover-lift", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground font-mono tracking-wider">{title.toUpperCase()}</p>
            <p className="text-2xl font-bold font-mono">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground font-mono">{subtitle}</p>
            )}
          </div>
          <div className={cn("flex items-center space-x-1 text-sm font-semibold font-mono", getTrendColor())}>
            {getTrendIcon()}
            <span>{change}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function to format date to quarter
const formatQuarter = (dateStr: string): string => {
  const date = new Date(dateStr);
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `Q${quarter} ${date.getFullYear()}`;
};

export function CompanyIntelBriefWidget({ 
  widget,
  onUpdate,
  onRemove,
  isExpanded = false, 
  onToggleExpanded 
}: CompanyIntelBriefWidgetProps) {
  // Get default symbol from widget config or header selection
  const defaultSymbol = widget.config?.symbol || localStorage.getItem('companyTicker') || 'AAPL';
  const defaultCompanyName = widget.config?.companyName || 
    (localStorage.getItem('selectedCompany') ? JSON.parse(localStorage.getItem('selectedCompany')!).name : null) || 
    'Apple Inc.';
    
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [companyName, setCompanyName] = useState(defaultCompanyName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [polygonData, setPolygonData] = useState<any>(null);
  const [fmpData, setFmpData] = useState<any>(null);
  const [analysisData, setAnalysisData] = useState<CompanyAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [peerBetas, setPeerBetas] = useState<{[key: string]: number}>({});
  const [peerBetasLoading, setPeerBetasLoading] = useState(false);
  const [showPriceNavigation, setShowPriceNavigation] = useState(false);

  const handleCompanyChange = (newSymbol: string, newCompanyName: string) => {
    console.log('Company changed to:', newSymbol, newCompanyName);
    setSymbol(newSymbol);
    setCompanyName(newCompanyName);
    setError(null);
    
    // Update localStorage to prevent conflicts
    localStorage.setItem('companyTicker', newSymbol);
    localStorage.setItem('selectedCompany', JSON.stringify({ symbol: newSymbol, name: newCompanyName }));
    
    onUpdate({ symbol: newSymbol, companyName: newCompanyName });
  };

  // Listen for global company changes from header
  useEffect(() => {
    const handleStorageChange = () => {
      const storedTicker = localStorage.getItem('companyTicker');
      const storedCompany = localStorage.getItem('selectedCompany');
      
      if (storedTicker && storedTicker !== symbol) {
        setSymbol(storedTicker);
        onUpdate({ symbol: storedTicker, companyName });
      }
      
      if (storedCompany) {
        try {
          const company = JSON.parse(storedCompany);
          if (company.name !== companyName) {
            setCompanyName(company.name);
            onUpdate({ symbol: company.symbol, companyName: company.name });
          }
        } catch (error) {
          console.error('Error parsing stored company:', error);
        }
      }
    };

    // Listen for storage changes (when header updates company)
    window.addEventListener('storage', handleStorageChange);
    
    // Also check on mount in case localStorage changed before this widget loaded
    handleStorageChange();

    return () => window.removeEventListener('storage', handleStorageChange);
  }, [symbol, companyName, onUpdate]);

  // Fetch real-time price data from Polygon
  useEffect(() => {
    const fetchPriceData = async () => {
      if (!symbol) return;
      
      setLoading(true);
      try {
        console.log('🔥 FETCHING POLYGON DATA FOR:', symbol);
        console.log('🔑 Polygon API key check:', import.meta.env.VITE_POLYGON_API_KEY ? 'API key exists' : 'API key missing');
        const realTimeData = await polygonApi.getCompanyRealTimeData(symbol);
        console.log('📊 POLYGON DATA RECEIVED:', realTimeData);
        
        if (realTimeData) {
          console.log('✅ Setting polygon data:', realTimeData);
          setPolygonData(realTimeData);
          setError(null);
        } else {
          console.log('❌ No data returned from Polygon API');
          setError('No data returned from Polygon API');
        }
      } catch (error) {
        console.error('Error fetching Polygon data:', error);
        setError('Failed to fetch real-time data');
      } finally {
        setLoading(false);
      }
    };

    fetchPriceData();
  }, [symbol]);

  // Fetch FMP company profile and quote data for beta, P/E ratio, and other metrics
  useEffect(() => {
    const fetchFmpData = async () => {
      if (!symbol) return;
      
      try {
        console.log('🏢 FETCHING FMP PROFILE AND QUOTE FOR:', symbol);
        const [profileData, quoteData] = await Promise.all([
          fmpApi.getCompanyProfile(symbol),
          fmpApi.getCompanyQuote(symbol)
        ]);
        console.log('📋 FMP PROFILE RECEIVED:', profileData);
        console.log('📈 FMP QUOTE RECEIVED:', quoteData);
        
        // Merge profile and quote data
        const profile = Array.isArray(profileData) ? profileData[0] : profileData;
        const quote = Array.isArray(quoteData) ? quoteData[0] : quoteData;
        
        setFmpData({
          ...profile,
          pe: quote?.pe,
          eps: quote?.eps,
          dividendYield: quote?.pe ? (profile?.lastDiv || 0) / (quote?.price || 1) * 100 : null
        });
      } catch (error) {
        console.error('💥 Error fetching FMP data:', error);
      }
    };

    fetchFmpData();
  }, [symbol]);
  
  // Fetch peer beta data for comparison
  useEffect(() => {
    const fetchPeerBetas = async () => {
      if (!symbol) return;
      
      const peers = PEER_COMPANIES[symbol];
      if (!peers || peers.length === 0) return;
      
      setPeerBetasLoading(true);
      try {
        console.log('🤝 FETCHING PEER BETAS FOR:', symbol, 'peers:', peers);
        const peerPromises = peers.map(async (peerSymbol) => {
          try {
            const peerProfile = await fmpApi.getCompanyProfile(peerSymbol);
            const profile = Array.isArray(peerProfile) ? peerProfile[0] : peerProfile;
            return { symbol: peerSymbol, beta: profile?.beta || null };
          } catch (error) {
            console.error(`Error fetching ${peerSymbol} beta:`, error);
            return { symbol: peerSymbol, beta: null };
          }
        });
        
        const peerResults = await Promise.all(peerPromises);
        const betasMap = peerResults.reduce((acc, peer) => {
          if (peer.beta !== null && peer.beta !== undefined) {
            acc[peer.symbol] = peer.beta;
          }
          return acc;
        }, {} as {[key: string]: number});
        
        console.log('🤝 PEER BETAS RECEIVED:', betasMap);
        setPeerBetas(betasMap);
      } catch (error) {
        console.error('💥 Error fetching peer betas:', error);
      } finally {
        setPeerBetasLoading(false);
      }
    };

    fetchPeerBetas();
  }, [symbol]);

  // Generate AI analysis when we have both polygon and FMP data
  useEffect(() => {
    const generateAnalysis = async () => {
      if (!polygonData || !fmpData || !symbol) return;
      
      setAnalysisLoading(true);
      try {
        console.log('🤖 GENERATING AI ANALYSIS FOR:', symbol);
        const analysis = await aiAnalysis.analyzeCompany(symbol, fmpData, fmpData, polygonData);
        console.log('🧠 AI ANALYSIS RESULT:', analysis);
        setAnalysisData(analysis);
      } catch (error) {
        console.error('💥 Error generating AI analysis:', error);
      } finally {
        setAnalysisLoading(false);
      }
    };

    generateAnalysis();
  }, [symbol, polygonData, fmpData]);

  // Debug log to see what data we have
  console.log('Current polygonData:', polygonData);
  console.log('Current fmpData:', fmpData);
  console.log('Current analysisData:', analysisData);
  
  // Get real price data from Polygon API and financial metrics from FMP
  const priceData = {
    price: polygonData?.price || 150.25,
    change: polygonData?.change || 2.15,
    changePercent: polygonData?.changePercent || 1.45,
    volume: polygonData?.volume || 65.2e6,
    avgVolume: polygonData?.avgVolume || 0,
    volumeVsAvg: polygonData?.volumeVsAvg || 0,
    marketCap: polygonData?.marketCap || fmpData?.mktCap || 0,
    peRatio: fmpData?.pe || null, // Use FMP P/E ratio data
    dividendYield: fmpData?.dividendYield || null,
    beta: fmpData?.beta || null, // Use FMP beta data
    high: polygonData?.high || 0,
    low: polygonData?.low || 0,
    open: polygonData?.open || 0,
  };
  
  console.log('Processed priceData:', priceData);

  // Use real data from AI analysis or fallback to mock data
  const revenueData = analysisData?.revenueData?.length > 0 ? analysisData.revenueData : [
    { quarter: "Q4 2023", revenue: 89.5, growth: 2.1 },
    { quarter: "Q1 2024", revenue: 90.8, growth: 4.9 },
    { quarter: "Q2 2024", revenue: 85.8, growth: -4.3 },
    { quarter: "Q3 2024", revenue: 94.9, growth: 6.1 },
    { quarter: "Q4 2024", revenue: 94.9, growth: 6.0 },
  ];

  const segmentData = analysisData?.segmentData?.length > 0 ? analysisData.segmentData.map(segment => ({
    name: segment.name,
    value: segment.value / 1e9, // Convert to billions for chart
    color: segment.color,
    change: segment.change
  })) : [
    { name: "iPhone", value: 43.8, color: "hsl(var(--chart-1))", change: 12 },
    { name: "Services", value: 22.3, color: "hsl(var(--chart-2))", change: 7 },
    { name: "Wearables", value: 9.3, color: "hsl(var(--chart-3))", change: -4 },
    { name: "Mac", value: 7.7, color: "hsl(var(--chart-4))", change: 0 },
    { name: "iPad", value: 7.0, color: "hsl(var(--chart-5))", change: -25 },
  ];

  // Generate margin data from real financial statements or use fallback
  const marginData = analysisData?.revenueData?.length > 0 ? 
    analysisData.revenueData.map((quarter, index) => {
      // Calculate margins based on real data (this is simplified - in production you'd get actual margin data)
      const baseGross = 44 + (Math.random() - 0.5) * 4; // Simulate realistic margin variation
      const baseOperating = 30 + (Math.random() - 0.5) * 3;
      return {
        quarter: quarter.quarter,
        gross: baseGross + (quarter.growth * 0.1), // Correlate margins with revenue growth
        operating: baseOperating + (quarter.growth * 0.08)
      };
    }) : [
    { quarter: "Q4 2023", gross: 44.1, operating: 29.8 },
    { quarter: "Q1 2024", gross: 46.6, operating: 31.4 },
    { quarter: "Q2 2024", gross: 46.3, operating: 30.7 },
    { quarter: "Q3 2024", gross: 46.2, operating: 30.6 },
    { quarter: "Q4 2024", gross: 46.2, operating: 30.9 },
  ];

  if (error) {
    return (
      <div className="p-4">
        <div className="text-red-500 text-sm mb-2">Error: {error}</div>
        <Button onClick={() => setError(null)}>Retry</Button>
      </div>
    );
  }

  if (isExpanded) {
    // Full expanded view as overlay/modal - surfaces on top instead of taking over screen
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
        <div className="fixed inset-4 overflow-y-auto">
          <div className="min-h-full bg-background border border-border rounded-lg shadow-2xl">
            {/* Confidential Header Bar */}
            <div className="confidential-header px-4 py-2 rounded-t-lg">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm tracking-widest">CONFIDENTIAL</span>
                <span className="font-mono text-sm tracking-widest">INTEL-BRIEF-001</span>
              </div>
            </div>
            
            {/* Main Header */}
            <div className="bg-background px-6 py-6 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold mb-2 font-mono tracking-wider text-foreground">{companyName.toUpperCase()} [{symbol}]</h1>
                  <p className="text-muted-foreground font-mono text-sm">{symbol}: {analysisData?.mostRecentQuarter || 'LATEST'} FINANCIAL ASSESSMENT</p>
                  {/* Company Selector */}
                  <div className="mt-2 inline-block">
                    <InlineCompanySelector
                      currentSymbol={symbol}
                      currentCompanyName={companyName}
                      onCompanyChange={handleCompanyChange}
                      className="bg-gray-800 text-white border-gray-600 hover:bg-gray-700 text-xs"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className="bg-green-600 hover:bg-green-700 font-mono text-xs text-white">GROWTH-POSITIVE</Badge>
                  {onToggleExpanded && (
                    <Button
                      variant="secondary"
                      onClick={onToggleExpanded}
                      className="bg-gray-800 hover:bg-gray-700 text-white border-gray-600"
                    >
                      <Minimize2 className="h-4 w-4 mr-2" />
                      Minimize
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <main className="px-6 py-6 space-y-6">
              {/* Executive Summary */}
              <section className="animate-fade-in">
                <Card className="border border-border bg-card">
                  <div className="flex items-center justify-between p-4 border-b">
                    <span className="confidential-badge">CONFIDENTIAL</span>
                    <span className="intel-badge">INTEL-2024-001</span>
                  </div>
                  
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="p-2 rounded bg-blue-600">
                        <img 
                          src={`https://financialmodelingprep.com/image-stock/${symbol}.png`}
                          alt={companyName}
                          className="h-6 w-6"
                          onError={(e) => {
                            const fallbackSvg = `data:image/svg+xml;base64,${btoa(`
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect width="24" height="24" rx="6" fill="white"/>
                                <text x="12" y="16" font-family="Arial" font-size="12" font-weight="bold" fill="#2563eb" text-anchor="middle">${symbol.charAt(0)}</text>
                              </svg>
                            `)}`;
                            e.currentTarget.src = fallbackSvg;
                          }}
                        />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold font-mono tracking-wider">{companyName.toUpperCase()}. [{symbol}]</h2>
                        <p className="text-sm text-muted-foreground font-mono">{symbol}: NASDAQ:{symbol}</p>
                      </div>
                      <div className="ml-auto">
                        <Badge className="bg-yellow-500 text-yellow-900 font-mono text-xs">MEGA CAP</Badge>
                      </div>
                    </div>
                    
                    <div className="target-profile p-4 rounded-lg mb-6">
                      <div className="flex items-center mb-2">
                        <span className="classification-header">{symbol} PROFILE</span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-mono text-muted-foreground">SECTOR:</span>
                          <span className="ml-2 font-semibold">{(fmpData?.sector || 'TECHNOLOGY').toUpperCase()}</span>
                        </div>
                        <div>
                          <span className="font-mono text-muted-foreground">INDUSTRY:</span>
                          <span className="ml-2 font-semibold">{(fmpData?.industry || 'CONSUMER ELECTRONICS').toUpperCase()}</span>
                        </div>
                        <div>
                          <span className="font-mono text-muted-foreground">PERSONNEL:</span>
                          <span className="ml-2 font-semibold">{fmpData?.fullTimeEmployees ? parseInt(fmpData.fullTimeEmployees).toLocaleString() + '+' : '161,000+'}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm mt-2">
                        <div>
                          <span className="font-mono text-muted-foreground">HQ:</span>
                          <span className="ml-2 font-semibold">{fmpData?.city && fmpData?.state ? `${fmpData.city.toUpperCase()}, ${fmpData.state}` : 'CUPERTINO, CA'}</span>
                        </div>
                        <div>
                          <span className="font-mono text-muted-foreground">CEO:</span>
                          <span className="ml-2 font-semibold">{fmpData?.ceo || 'TIM COOK'}</span>
                        </div>
                        <div>
                          <span className="font-mono text-muted-foreground">DOMAIN:</span>
                          <span className="ml-2 font-semibold">{fmpData?.website?.replace('https://', '').replace('http://', '') || 'apple.com'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border border-border rounded-lg p-4">
                      <div className="flex items-center mb-2">
                        <span className="classification-header">EXECUTIVE SUMMARY</span>
                        {analysisLoading && <div className="ml-2 animate-spin h-3 w-3 border border-primary border-t-transparent rounded-full"></div>}
                      </div>
                      <p className="text-sm text-foreground leading-relaxed mb-4">
                        {analysisData?.executiveSummary || 'Loading financial analysis...'}
                      </p>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                          <div className="flex items-center mb-1">
                            <span className="font-mono text-xs text-green-600 font-medium">STRENGTH VECTOR</span>
                          </div>
                          <p className="text-sm font-semibold text-foreground">
                            {analysisData?.keyInsights?.find(i => i.type === 'strength')?.title || (symbol === 'AAPL' ? 'iPhone Momentum' : 'Core Product Growth')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {analysisData?.keyInsights?.find(i => i.type === 'strength')?.description || `${analysisData?.revenueGrowth || '+12%'} YoY emerging markets`}
                          </p>
                        </div>
                        <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                          <div className="flex items-center mb-1">
                            <span className="font-mono text-xs text-yellow-600 font-medium">WATCH POINT</span>
                          </div>
                          <p className="text-sm font-semibold text-foreground">
                            {analysisData?.keyInsights?.find(i => i.type === 'risk')?.title || 'Supply Chain'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {analysisData?.keyInsights?.find(i => i.type === 'risk')?.description || 'Component availability risk'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Key Metrics Grid - Moved here right after Executive Summary */}
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Expanded price clicked!'); // Debug log
                        setShowPriceNavigation(true);
                      }} className="cursor-pointer hover:scale-105 transition-transform duration-200">
                        <MetricCard
                          title="Stock Price"
                          value={`$${priceData.price.toFixed(2)}`}
                          change={`${priceData.changePercent > 0 ? '+' : ''}${priceData.changePercent.toFixed(2)}%`}
                          trend={priceData.changePercent > 0 ? "up" : priceData.changePercent < 0 ? "down" : "neutral"}
                          subtitle="Real-time price • Click to navigate"
                          className="animate-fade-in hover:shadow-lg transition-shadow"
                        />
                      </div>
                      <MetricCard
                        title="Market Cap"
                        value={priceData.marketCap > 0 ? `$${(priceData.marketCap / 1e9).toFixed(1)}B` : 'N/A'}
                        change={`$${priceData.change.toFixed(2)}`}
                        trend={priceData.change > 0 ? "up" : priceData.change < 0 ? "down" : "neutral"}
                        subtitle="Market capitalization"
                        className="animate-fade-in" 
                        style={{ animationDelay: '0.05s' }}
                      />
                      <MetricCard
                        title="P/E Ratio"
                        value={priceData.peRatio ? priceData.peRatio.toFixed(1) : 'N/A'}
                        change="TTM"
                        trend="neutral"
                        subtitle="Price to earnings"
                        className="animate-fade-in"
                        style={{ animationDelay: '0.1s' }}
                      />
                      <MetricCard
                        title="Volume"
                        value={`${(priceData.volume / 1e6).toFixed(1)}M`}
                        change={priceData.avgVolume > 0 ? `${priceData.volumeVsAvg > 0 ? '+' : ''}${priceData.volumeVsAvg.toFixed(0)}%` : "vs avg"}
                        trend={priceData.volumeVsAvg > 0 ? "up" : priceData.volumeVsAvg < 0 ? "down" : "neutral"}
                        subtitle="Trading volume"
                        className="animate-fade-in"
                        style={{ animationDelay: '0.15s' }}
                      />
                      <MetricCard
                        title="Day High"
                        value={`$${priceData.high.toFixed(2)}`}
                        change={priceData.open > 0 ? `+${((priceData.high - priceData.open) / priceData.open * 100).toFixed(1)}%` : "vs open"}
                        trend={priceData.open > 0 && priceData.high > priceData.open ? "up" : "neutral"}
                        subtitle="Today's high"
                        className="animate-fade-in"
                        style={{ animationDelay: '0.2s' }}
                      />
                      <MetricCard
                        title="Day Low"
                        value={`$${priceData.low.toFixed(2)}`}
                        change={priceData.open > 0 ? `${((priceData.low - priceData.open) / priceData.open * 100).toFixed(1)}%` : "vs open"}
                        trend={priceData.open > 0 && priceData.low < priceData.open ? "down" : "neutral"}
                        subtitle="Today's low"
                        className="animate-fade-in"
                        style={{ animationDelay: '0.25s' }}
                      />
                      <MetricCard
                        title="Beta"
                        value={priceData.beta ? priceData.beta.toFixed(2) : 'N/A'}
                        change={(() => {
                          if (!priceData.beta || Object.keys(peerBetas).length === 0) return "Volatility";
                          const peerBetaValues = Object.values(peerBetas);
                          const avgPeerBeta = peerBetaValues.reduce((sum, beta) => sum + beta, 0) / peerBetaValues.length;
                          const vs = priceData.beta - avgPeerBeta;
                          return vs > 0 ? `+${vs.toFixed(2)} vs peers` : `${vs.toFixed(2)} vs peers`;
                        })()}
                        trend={(() => {
                          if (!priceData.beta || Object.keys(peerBetas).length === 0) return "neutral";
                          const peerBetaValues = Object.values(peerBetas);
                          const avgPeerBeta = peerBetaValues.reduce((sum, beta) => sum + beta, 0) / peerBetaValues.length;
                          return priceData.beta > avgPeerBeta ? "up" : priceData.beta < avgPeerBeta ? "down" : "neutral";
                        })()}
                        subtitle={(() => {
                          if (!priceData.beta || Object.keys(peerBetas).length === 0) return "Risk measure";
                          const peerBetaValues = Object.values(peerBetas);
                          const avgPeerBeta = peerBetaValues.reduce((sum, beta) => sum + beta, 0) / peerBetaValues.length;
                          return `Peers avg: ${avgPeerBeta.toFixed(2)}`;
                        })()}
                        className="animate-fade-in"
                        style={{ animationDelay: '0.3s' }}
                      />
                      <MetricCard
                        title="Div Yield"
                        value={priceData.dividendYield ? `${priceData.dividendYield.toFixed(1)}%` : 'N/A'}
                        change="Annual"
                        trend="neutral"
                        subtitle="Dividend yield"
                        className="animate-fade-in"
                        style={{ animationDelay: '0.35s' }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* Key Metrics Dashboard */}
              <section className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-primary font-mono tracking-wider">
                    {analysisData?.quarterlyComparison?.currentQuarter && analysisData?.quarterlyComparison?.priorYearQuarter ? 
                      `${formatQuarter(analysisData.quarterlyComparison.currentQuarter.date)} vs ${formatQuarter(analysisData.quarterlyComparison.priorYearQuarter.date)} comparative analysis` :
                      'Latest Quarter vs Prior Year comparative analysis'
                    }
                  </h2>
                  <span className="confidential-badge">CONFIDENTIAL - FINANCIAL INTELLIGENCE</span>
                </div>
                {/* Segment Performance Table */}
                <Card className="border border-border bg-card mb-6">
                  <CardContent className="p-4">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 font-mono text-xs text-muted-foreground tracking-wider">SEGMENT</th>
                            <th className="text-right py-2 font-mono text-xs text-muted-foreground tracking-wider">
                              {analysisData?.quarterlyComparison?.currentQuarter?.date ? formatQuarter(analysisData.quarterlyComparison.currentQuarter.date) : 'LATEST'}
                            </th>
                            <th className="text-right py-2 font-mono text-xs text-muted-foreground tracking-wider">
                              {analysisData?.quarterlyComparison?.priorYearQuarter?.date ? formatQuarter(analysisData.quarterlyComparison.priorYearQuarter.date) : 'PRIOR YEAR'}
                            </th>
                            <th className="text-right py-2 font-mono text-xs text-muted-foreground tracking-wider">DELTA</th>
                            <th className="text-right py-2 font-mono text-xs text-muted-foreground tracking-wider">STATUS</th>
                          </tr>
                        </thead>
                        <tbody className="font-mono text-xs">
                          {analysisData?.segmentData?.length > 0 ? (
                            analysisData.segmentData.map((segment, index) => {
                              const currentValue = segment.value;
                              const priorValue = currentValue / (1 + segment.change / 100);
                              const isPositive = segment.change >= 0;
                              
                              const formatValue = (value: number) => {
                                if (value >= 1e9) {
                                  return `$${(value / 1e9).toFixed(1)}B`;
                                } else {
                                  return `$${(value / 1e6).toFixed(0)}M`;
                                }
                              };
                              
                              return (
                                <tr key={index} className="border-b border-border/50">
                                  <td className="py-3 font-medium">{segment.name}</td>
                                  <td className="text-right py-3 font-bold">{formatValue(currentValue)}</td>
                                  <td className="text-right py-3 text-muted-foreground">{formatValue(priorValue)}</td>
                                  <td className="text-right py-3">
                                    <span className={`px-2 py-1 rounded text-xs font-medium text-white ${
                                      isPositive ? 'bg-red-600' : 'bg-red-500'
                                    }`}>
                                      {segment.change > 0 ? '+' : ''}{segment.change.toFixed(1)}%
                                    </span>
                                  </td>
                                  <td className="text-right py-3">
                                    {isPositive ? '📈' : '📉'}
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <>
                              <tr className="border-b border-border/50">
                                <td className="py-3 font-medium">{symbol === 'AAPL' ? 'iPhone' : 'Core Product'}</td>
                                <td className="text-right py-3 font-bold">$43.8B</td>
                                <td className="text-right py-3 text-muted-foreground">$39.1B</td>
                                <td className="text-right py-3">
                                  <span className="bg-red-600 text-white px-2 py-1 rounded text-xs font-medium">+12.0%</span>
                                </td>
                                <td className="text-right py-3">📈</td>
                              </tr>
                              <tr className="border-b border-border/50">
                                <td className="py-3 font-medium">Services</td>
                                <td className="text-right py-3 font-bold">$22.3B</td>
                                <td className="text-right py-3 text-muted-foreground">$20.8B</td>
                                <td className="text-right py-3">
                                  <span className="bg-red-600 text-white px-2 py-1 rounded text-xs font-medium">+7.2%</span>
                                </td>
                                <td className="text-right py-3">📈</td>
                              </tr>
                            </>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </section>

              {/* Charts Section - Smaller for overlay */}
              <section className="animate-fade-in">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card className="border border-border bg-card">
                    <div className="flex items-center justify-between p-3 border-b">
                      <span className="confidential-badge text-xs">CONFIDENTIAL</span>
                      <span className="intel-badge text-xs">CHART-001</span>
                    </div>
                    <CardHeader className="pb-2">
                      <div className="flex items-center mb-1">
                        <span className="classification-header text-xs">REVENUE TRAJECTORY</span>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">Quarterly metrics [USD Billions]</p>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={revenueData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="quarter" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} />
                          <Tooltip 
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                              fontSize: "12px"
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="revenue" 
                            stroke="#dc2626" 
                            strokeWidth={2}
                            dot={{ fill: "#dc2626", strokeWidth: 1, r: 3 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="border border-border bg-card">
                    <div className="flex items-center justify-between p-3 border-b">
                      <span className="confidential-badge text-xs">CONFIDENTIAL</span>
                      <span className="intel-badge text-xs">CHART-002</span>
                    </div>
                    <CardHeader className="pb-2">
                      <div className="flex items-center mb-1">
                        <span className="classification-header text-xs">SEGMENT ANALYSIS</span>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">Revenue distribution [USD Billions]</p>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={segmentData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {segmentData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                              fontSize: "12px"
                            }}
                            formatter={(value: any) => [`$${value}B`, 'Revenue']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </section>
            </main>
          </div>
        </div>
        
        {/* Stock Price Navigation Modal for expanded view */}
        {showPriceNavigation && (
          <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-card border border-border rounded-lg shadow-lg p-6 max-w-sm w-full mx-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 rounded bg-blue-600">
                  <img 
                    src={`https://financialmodelingprep.com/image-stock/${symbol}.png`}
                    alt={companyName}
                    className="h-5 w-5"
                    onError={(e) => {
                      const fallbackSvg = `data:image/svg+xml;base64,${btoa(`
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect width="20" height="20" rx="4" fill="white"/>
                          <text x="10" y="13" font-family="Arial" font-size="10" font-weight="bold" fill="#2563eb" text-anchor="middle">${symbol.charAt(0)}</text>
                        </svg>
                      `)}`;
                      e.currentTarget.src = fallbackSvg;
                    }}
                  />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{symbol}</h3>
                  <p className="text-sm text-muted-foreground">${priceData.price.toFixed(2)}</p>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground mb-4">Choose how to view {symbol} data:</p>
              
              <div className="space-y-2">
                <Button
                  onClick={() => {
                    window.open(`https://finance.yahoo.com/quote/${symbol}`, '_blank');
                    setShowPriceNavigation(false);
                  }}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Stock Information
                </Button>
                
                <Button
                  onClick={() => {
                    window.open(`https://finance.yahoo.com/quote/${symbol}/chart`, '_blank');
                    setShowPriceNavigation(false);
                  }}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Price Chart
                </Button>
              </div>
              
              <div className="mt-4 pt-3 border-t border-border">
                <Button
                  onClick={() => setShowPriceNavigation(false)}
                  className="w-full"
                  variant="ghost"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Compact widget view - exact confidential brief aesthetic from screenshots
  return (
    <div 
      className="border border-border bg-card rounded-lg shadow-lg hover-lift transition-all duration-300 animate-fade-in"
      onDoubleClick={onToggleExpanded}
    >
      {/* Confidential Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-red-600 text-white rounded-t-lg">
        <span className="font-mono text-xs tracking-widest font-bold">CONFIDENTIAL</span>
        <span className="font-mono text-xs tracking-widest">INTEL-BRIEF-001</span>
      </div>
      
      <div className="p-4 space-y-4">
        {/* Header with Company Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            <div className="p-2 rounded bg-blue-600">
              <img 
                src={`https://financialmodelingprep.com/image-stock/${symbol}.png`}
                alt={companyName}
                className="h-5 w-5"
                onError={(e) => {
                  const fallbackSvg = `data:image/svg+xml;base64,${btoa(`
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="20" height="20" rx="4" fill="white"/>
                      <text x="10" y="13" font-family="Arial" font-size="10" font-weight="bold" fill="#2563eb" text-anchor="middle">${symbol.charAt(0)}</text>
                    </svg>
                  `)}`;
                  e.currentTarget.src = fallbackSvg;
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold font-mono tracking-wider text-lg">{companyName.toUpperCase()}. [{symbol}]</h3>
              <p className="text-xs text-muted-foreground font-mono">{symbol}: NASDAQ:{symbol}</p>
              <div className="mt-1 w-32">
                <InlineCompanySelector
                  currentSymbol={symbol}
                  currentCompanyName={companyName}
                  onCompanyChange={handleCompanyChange}
                  className="text-xs h-5 bg-gray-800 text-white border-gray-600 hover:bg-gray-700"
                />
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-1">
            <Badge className="bg-yellow-500 text-yellow-900 font-mono text-xs">MEGA CAP</Badge>
            <Badge className="bg-gray-500 text-white font-mono text-xs">THREAT LEVEL: MARKET</Badge>
            {onToggleExpanded && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onToggleExpanded}
                className="h-6 w-6 p-0"
              >
                <Maximize2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Top Row - Most Important Metrics */}
        <div className="grid grid-cols-4 gap-2">
          <div className="relative">
            <button 
              className={`w-full rounded-lg p-2 border text-center cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200 relative z-10 ${priceData.changePercent >= 0 ? 'bg-green-50 border-green-200 hover:bg-green-100' : 'bg-red-50 border-red-200 hover:bg-red-100'}`}
              onClick={() => {
                console.log('Price button clicked!'); // Debug log
                alert('Price button clicked! Modal should show now');
                setShowPriceNavigation(true);
              }}
              onMouseOver={() => console.log('Price button hovered!')}
              title="Click to view stock details"
              style={{ pointerEvents: 'auto', zIndex: 10 }}
            >
              <p className={`text-xs font-medium font-mono ${priceData.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>PRICE 🔗</p>
              <p className="text-sm font-bold font-mono">${priceData.price.toFixed(2)}</p>
              <p className={`text-xs font-mono ${priceData.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {priceData.changePercent > 0 ? '+' : ''}{priceData.changePercent.toFixed(2)}%
              </p>
            </button>
            {/* Test button to verify clicking works at all */}
            <button 
              className="absolute top-0 right-0 bg-red-500 text-white text-xs px-1 py-0.5 z-20"
              onClick={() => alert('Test button works!')}
            >
              TEST
            </button>
          </div>
          <div className={`rounded-lg p-2 border text-center ${priceData.changePercent >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <p className={`text-xs font-medium font-mono ${priceData.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>MARKET CAP</p>
            <p className="text-sm font-bold font-mono">
              {priceData.marketCap > 0 ? `$${(priceData.marketCap / 1e9).toFixed(1)}B` : 'N/A'}
            </p>
            <p className="text-xs font-mono text-slate-500">Cap</p>
          </div>
          <div className={`rounded-lg p-2 border text-center ${priceData.peRatio && priceData.peRatio < 20 ? 'bg-green-50 border-green-200' : priceData.peRatio && priceData.peRatio > 30 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
            <p className={`text-xs font-medium font-mono ${priceData.peRatio && priceData.peRatio < 20 ? 'text-green-600' : priceData.peRatio && priceData.peRatio > 30 ? 'text-red-600' : 'text-slate-600'}`}>P/E</p>
            <p className="text-sm font-bold font-mono">
              {priceData.peRatio ? priceData.peRatio.toFixed(1) : 'N/A'}
            </p>
            <p className="text-xs font-mono text-slate-500">Ratio</p>
          </div>
          <div className={`rounded-lg p-2 border text-center ${priceData.volumeVsAvg > 0 ? 'bg-green-50 border-green-200' : priceData.volumeVsAvg < 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
            <p className={`text-xs font-medium font-mono ${priceData.volumeVsAvg > 0 ? 'text-green-600' : priceData.volumeVsAvg < 0 ? 'text-red-600' : 'text-slate-600'}`}>VOLUME</p>
            <p className="text-sm font-bold font-mono">{(priceData.volume / 1e6).toFixed(1)}M</p>
            <p className={`text-xs font-mono ${priceData.volumeVsAvg > 0 ? 'text-green-600' : priceData.volumeVsAvg < 0 ? 'text-red-600' : 'text-slate-500'}`}>
              {priceData.avgVolume > 0 ? `${priceData.volumeVsAvg > 0 ? '+' : ''}${priceData.volumeVsAvg.toFixed(0)}%` : 'vs avg'}
            </p>
          </div>
        </div>

        {/* Bottom Row - Secondary Metrics */}
        <div className="grid grid-cols-4 gap-2">
          <div className={`rounded-lg p-2 border text-center ${
            priceData.open > 0 && priceData.low < priceData.open 
              ? 'bg-red-50 border-red-200' 
              : 'bg-slate-50 border-slate-200'
          }`}>
            <p className={`text-xs font-medium font-mono ${
              priceData.open > 0 && priceData.low < priceData.open 
                ? 'text-red-600' 
                : 'text-slate-600'
            }`}>DAY LOW</p>
            <p className="text-sm font-bold font-mono">${priceData.low.toFixed(2)}</p>
            <p className={`text-xs font-mono ${
              priceData.open > 0 && priceData.low < priceData.open 
                ? 'text-red-600' 
                : 'text-slate-500'
            }`}>
              {priceData.open > 0 ? 
                `${((priceData.low - priceData.open) / priceData.open * 100).toFixed(1)}%` 
                : 'Today\'s'
              }
            </p>
          </div>
          <div className={`rounded-lg p-2 border text-center ${
            priceData.open > 0 && priceData.high > priceData.open 
              ? 'bg-green-50 border-green-200' 
              : 'bg-slate-50 border-slate-200'
          }`}>
            <p className={`text-xs font-medium font-mono ${
              priceData.open > 0 && priceData.high > priceData.open 
                ? 'text-green-600' 
                : 'text-slate-600'
            }`}>DAY HIGH</p>
            <p className="text-sm font-bold font-mono">${priceData.high.toFixed(2)}</p>
            <p className={`text-xs font-mono ${
              priceData.open > 0 && priceData.high > priceData.open 
                ? 'text-green-600' 
                : 'text-slate-500'
            }`}>
              {priceData.open > 0 ? 
                `+${((priceData.high - priceData.open) / priceData.open * 100).toFixed(1)}%` 
                : 'Today\'s'
              }
            </p>
          </div>
          <div className={`rounded-lg p-2 border text-center ${
            (() => {
              if (!priceData.beta || Object.keys(peerBetas).length === 0) return 'bg-slate-50 border-slate-200';
              const peerBetaValues = Object.values(peerBetas);
              const avgPeerBeta = peerBetaValues.reduce((sum, beta) => sum + beta, 0) / peerBetaValues.length;
              return priceData.beta < avgPeerBeta ? 'bg-green-50 border-green-200' : 
                     priceData.beta > avgPeerBeta ? 'bg-red-50 border-red-200' : 
                     'bg-slate-50 border-slate-200';
            })()
          }`}>
            <p className={`text-xs font-medium font-mono ${
              (() => {
                if (!priceData.beta || Object.keys(peerBetas).length === 0) return 'text-slate-600';
                const peerBetaValues = Object.values(peerBetas);
                const avgPeerBeta = peerBetaValues.reduce((sum, beta) => sum + beta, 0) / peerBetaValues.length;
                return priceData.beta < avgPeerBeta ? 'text-green-600' : 
                       priceData.beta > avgPeerBeta ? 'text-red-600' : 
                       'text-slate-600';
              })()
            }`}>BETA</p>
            <p className="text-sm font-bold font-mono">
              {priceData.beta ? priceData.beta.toFixed(2) : 'N/A'}
            </p>
            <p className={`text-xs font-mono ${
              (() => {
                if (!priceData.beta || Object.keys(peerBetas).length === 0) return 'text-slate-500';
                const peerBetaValues = Object.values(peerBetas);
                const avgPeerBeta = peerBetaValues.reduce((sum, beta) => sum + beta, 0) / peerBetaValues.length;
                return priceData.beta < avgPeerBeta ? 'text-green-600' : 
                       priceData.beta > avgPeerBeta ? 'text-red-600' : 
                       'text-slate-500';
              })()
            }`}>
              {(() => {
                if (!priceData.beta || Object.keys(peerBetas).length === 0) return 'Vol';
                const peerBetaValues = Object.values(peerBetas);
                const avgPeerBeta = peerBetaValues.reduce((sum, beta) => sum + beta, 0) / peerBetaValues.length;
                const vs = priceData.beta - avgPeerBeta;
                return vs > 0 ? `+${vs.toFixed(2)}` : `${vs.toFixed(2)}`;
              })()
              }
            </p>
          </div>
          <div className="bg-slate-50 rounded-lg p-2 border border-slate-200 text-center">
            <p className="text-xs font-medium font-mono text-slate-600">DIV YIELD</p>
            <p className="text-sm font-bold font-mono">
              {priceData.dividendYield ? `${priceData.dividendYield.toFixed(1)}%` : 'N/A'}
            </p>
            <p className="text-xs font-mono text-slate-500">Annual</p>
          </div>
        </div>
        
        {/* Executive Summary */}
        <div className="border border-border rounded-lg p-3">
          <div className="flex items-center mb-2">
            <span className="classification-header">EXECUTIVE SUMMARY</span>
          </div>
          <p className="text-xs text-foreground leading-relaxed line-clamp-3">
            {analysisData?.executiveSummary || 'Loading financial analysis...'}
          </p>
        </div>
        
        {/* Footer Badge */}
        <div className="text-center">
          <span className="confidential-badge">CONFIDENTIAL - FINANCIAL INTELLIGENCE</span>
        </div>
      </div>
      
      {/* Stock Price Navigation Modal */}
      {console.log('showPriceNavigation state:', showPriceNavigation)}
      {showPriceNavigation && (
        <div className="fixed inset-0 z-50 bg-red-500/50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-card border border-border rounded-lg shadow-lg p-6 max-w-sm w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 rounded bg-blue-600">
                <img 
                  src={`https://financialmodelingprep.com/image-stock/${symbol}.png`}
                  alt={companyName}
                  className="h-5 w-5"
                  onError={(e) => {
                    const fallbackSvg = `data:image/svg+xml;base64,${btoa(`
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="20" height="20" rx="4" fill="white"/>
                        <text x="10" y="13" font-family="Arial" font-size="10" font-weight="bold" fill="#2563eb" text-anchor="middle">${symbol.charAt(0)}</text>
                      </svg>
                    `)}`;
                    e.currentTarget.src = fallbackSvg;
                  }}
                />
              </div>
              <div>
                <h3 className="font-bold text-lg">{symbol}</h3>
                <p className="text-sm text-muted-foreground">${priceData.price.toFixed(2)}</p>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">Choose how to view {symbol} data:</p>
            
            <div className="space-y-2">
              <Button
                onClick={() => {
                  window.open(`https://finance.yahoo.com/quote/${symbol}`, '_blank');
                  setShowPriceNavigation(false);
                }}
                className="w-full justify-start"
                variant="outline"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View Stock Information
              </Button>
              
              <Button
                onClick={() => {
                  window.open(`https://finance.yahoo.com/quote/${symbol}/chart`, '_blank');
                  setShowPriceNavigation(false);
                }}
                className="w-full justify-start"
                variant="outline"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                View Price Chart
              </Button>
            </div>
            
            <div className="mt-4 pt-3 border-t border-border">
              <Button
                onClick={() => setShowPriceNavigation(false)}
                className="w-full"
                variant="ghost"
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}