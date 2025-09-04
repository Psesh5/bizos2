import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import { TrendingUp, TrendingDown, Minus, Apple, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { WidgetProps } from '@/types/widget';
import { InlineCompanySelector } from '../InlineCompanySelector';
import { polygonApi } from '@/services/polygon-api';
import { fmpApi } from '@/services/fmp-api';

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

  const handleCompanyChange = (newSymbol: string, newCompanyName: string) => {
    console.log('Company changed to:', newSymbol, newCompanyName);
    setSymbol(newSymbol);
    setCompanyName(newCompanyName);
    setError(null);
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

  // Fetch FMP company profile data for beta and other metrics
  useEffect(() => {
    const fetchFmpData = async () => {
      if (!symbol) return;
      
      try {
        console.log('🏢 FETCHING FMP PROFILE FOR:', symbol);
        const profileData = await fmpApi.getCompanyProfile(symbol);
        console.log('📋 FMP PROFILE RECEIVED:', profileData);
        // FMP returns an array, get the first item
        setFmpData(Array.isArray(profileData) ? profileData[0] : profileData);
      } catch (error) {
        console.error('💥 Error fetching FMP data:', error);
      }
    };

    fetchFmpData();
  }, [symbol]);

  // Debug log to see what data we have
  console.log('Current polygonData:', polygonData);
  console.log('Current fmpData:', fmpData);
  
  // Get real price data from Polygon API, fallback to mock for other metrics
  const priceData = {
    price: polygonData?.price || 150.25,
    change: polygonData?.change || 2.15,
    changePercent: polygonData?.changePercent || 1.45,
    volume: polygonData?.volume || 65.2e6,
    avgVolume: polygonData?.avgVolume || 0,
    volumeVsAvg: polygonData?.volumeVsAvg || 0,
    marketCap: polygonData?.marketCap || 0,
    peRatio: polygonData?.peRatio || null,
    dividendYield: polygonData?.dividendYield || null,
    beta: fmpData?.beta || null, // Use FMP beta data
    high: polygonData?.high || 0,
    low: polygonData?.low || 0,
  };
  
  console.log('Processed priceData:', priceData);

  // Mock data for other metrics (will be replaced later)
  const mockData = {
    marketCap: 2.8e12,
    pe: 28.5,
  };

  const revenueData = [
    { quarter: "Q4 2023", revenue: 89.5, growth: 2.1 },
    { quarter: "Q1 2024", revenue: 90.8, growth: 4.9 },
    { quarter: "Q2 2024", revenue: 85.8, growth: -4.3 },
    { quarter: "Q3 2024", revenue: 94.9, growth: 6.1 },
    { quarter: "Q4 2024", revenue: 94.9, growth: 6.0 },
  ];

  const segmentData = [
    { name: "iPhone", value: 43.8, color: "hsl(var(--chart-1))" },
    { name: "Services", value: 22.3, color: "hsl(var(--chart-2))" },
    { name: "Wearables", value: 9.3, color: "hsl(var(--chart-3))" },
    { name: "Mac", value: 7.7, color: "hsl(var(--chart-4))" },
    { name: "iPad", value: 7.0, color: "hsl(var(--chart-5))" },
  ];

  const marginData = [
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
    // Full expanded view - exact confidential brief aesthetic from screenshots
    return (
      <div className="min-h-screen bg-background">
        {/* Confidential Header Bar */}
        <div className="confidential-header px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <span className="font-mono text-sm tracking-widest">CONFIDENTIAL</span>
            <span className="font-mono text-sm tracking-widest">INTEL-BRIEF-001</span>
          </div>
        </div>
        
        {/* Main Header */}
        <header className="bg-gradient-primary text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2 font-mono tracking-wider">{companyName.toUpperCase()} [{symbol}]</h1>
                <p className="text-primary-foreground/80 font-mono">TARGET: Q4-2024 FINANCIAL ASSESSMENT</p>
                {/* Company Selector */}
                <div className="mt-2 bg-white/10 rounded-lg p-1 inline-block">
                  <InlineCompanySelector
                    currentSymbol={symbol}
                    currentCompanyName={companyName}
                    onCompanyChange={handleCompanyChange}
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className="bg-green-600 hover:bg-green-700 font-mono text-xs">GROWTH-POSITIVE</Badge>
                {onToggleExpanded && (
                  <Button
                    variant="secondary"
                    onClick={onToggleExpanded}
                    className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                  >
                    <Minimize2 className="h-4 w-4 mr-2" />
                    Minimize
                  </Button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
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
                    <Apple className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold font-mono tracking-wider">{companyName.toUpperCase()}. [{symbol}]</h2>
                    <p className="text-sm text-muted-foreground font-mono">TARGET: NASDAQ:{symbol}</p>
                  </div>
                  <div className="ml-auto">
                    <Badge className="bg-yellow-500 text-yellow-900 font-mono text-xs">MEGA CAP</Badge>
                  </div>
                </div>
                
                <div className="target-profile p-4 rounded-lg mb-6">
                  <div className="flex items-center mb-2">
                    <span className="classification-header">TARGET PROFILE</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-mono text-muted-foreground">SECTOR:</span>
                      <span className="ml-2 font-semibold">TECHNOLOGY</span>
                    </div>
                    <div>
                      <span className="font-mono text-muted-foreground">INDUSTRY:</span>
                      <span className="ml-2 font-semibold">CONSUMER ELECTRONICS</span>
                    </div>
                    <div>
                      <span className="font-mono text-muted-foreground">PERSONNEL:</span>
                      <span className="ml-2 font-semibold">161,000+</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm mt-2">
                    <div>
                      <span className="font-mono text-muted-foreground">HQ:</span>
                      <span className="ml-2 font-semibold">CUPERTINO, CA</span>
                    </div>
                    <div>
                      <span className="font-mono text-muted-foreground">ESTABLISHED:</span>
                      <span className="ml-2 font-semibold">1976-04-01</span>
                    </div>
                    <div>
                      <span className="font-mono text-muted-foreground">DOMAIN:</span>
                      <span className="ml-2 font-semibold">apple.com</span>
                    </div>
                  </div>
                </div>
                
                <div className="border border-border rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <span className="classification-header">EXECUTIVE SUMMARY</span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed mb-4">
                    Target reported exceptional Q4 results with <span className="font-semibold text-green-600">+15% YoY</span> revenue growth, 
                    driven by robust {symbol === 'AAPL' ? 'iPhone' : 'core product'} sales and continued services expansion. Revenue reached 
                    <span className="font-semibold text-blue-600">$89.5B</span>, 
                    exceeding analyst projections by <span className="font-semibold text-green-600">+$2.1B</span>. Supply chain vulnerabilities remain under surveillance. 
                    Target demonstrates strong operational discipline and sustained market penetration across primary product vectors.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                      <div className="flex items-center mb-1">
                        <span className="font-mono text-xs text-green-600 font-medium">STRENGTH VECTOR</span>
                      </div>
                      <p className="text-sm font-semibold text-foreground">{symbol === 'AAPL' ? 'iPhone Momentum' : 'Core Product Growth'}</p>
                      <p className="text-xs text-muted-foreground">+12% YoY emerging markets</p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                      <div className="flex items-center mb-1">
                        <span className="font-mono text-xs text-yellow-600 font-medium">WATCH POINT</span>
                      </div>
                      <p className="text-sm font-semibold text-foreground">Supply Chain</p>
                      <p className="text-xs text-muted-foreground">Component availability risk</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Key Metrics Dashboard */}
          <section className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-primary font-mono tracking-wider">Q4-2024 vs Q4-2023 comparative analysis</h2>
              <span className="confidential-badge">CONFIDENTIAL - FINANCIAL INTELLIGENCE</span>
            </div>
            {/* Segment Performance Table */}
            <Card className="border border-border bg-card mb-8">
              <CardContent className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 font-mono text-sm text-muted-foreground tracking-wider">SEGMENT</th>
                        <th className="text-right py-3 font-mono text-sm text-muted-foreground tracking-wider">Q4-2024</th>
                        <th className="text-right py-3 font-mono text-sm text-muted-foreground tracking-wider">Q4-2023</th>
                        <th className="text-right py-3 font-mono text-sm text-muted-foreground tracking-wider">DELTA</th>
                        <th className="text-right py-3 font-mono text-sm text-muted-foreground tracking-wider">STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono text-sm">
                      <tr className="border-b border-border/50">
                        <td className="py-4 font-medium">{symbol === 'AAPL' ? 'iPhone' : 'Core Product'}</td>
                        <td className="text-right py-4 font-bold">$43.8B</td>
                        <td className="text-right py-4 text-muted-foreground">$39.1B</td>
                        <td className="text-right py-4">
                          <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">+12.0%</span>
                        </td>
                        <td className="text-right py-4 text-green-600">📈</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-4 font-medium">Services</td>
                        <td className="text-right py-4 font-bold">$22.3B</td>
                        <td className="text-right py-4 text-muted-foreground">$20.8B</td>
                        <td className="text-right py-4">
                          <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">+7.2%</span>
                        </td>
                        <td className="text-right py-4 text-green-600">📈</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-4 font-medium">Mac</td>
                        <td className="text-right py-4 font-bold">$7.7B</td>
                        <td className="text-right py-4 text-muted-foreground">$7.7B</td>
                        <td className="text-right py-4">
                          <span className="bg-gray-400 text-white px-2 py-1 rounded text-xs font-medium">+0.0%</span>
                        </td>
                        <td className="text-right py-4 text-yellow-600">➡️</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-4 font-medium">iPad</td>
                        <td className="text-right py-4 font-bold">$7.0B</td>
                        <td className="text-right py-4 text-muted-foreground">$9.4B</td>
                        <td className="text-right py-4">
                          <span className="bg-red-500 text-white px-2 py-1 rounded text-xs font-medium">-25.5%</span>
                        </td>
                        <td className="text-right py-4 text-red-600">📉</td>
                      </tr>
                      <tr className="border-b border-border/50">
                        <td className="py-4 font-medium">Wearables</td>
                        <td className="text-right py-4 font-bold">$9.3B</td>
                        <td className="text-right py-4 text-muted-foreground">$9.7B</td>
                        <td className="text-right py-4">
                          <span className="bg-red-500 text-white px-2 py-1 rounded text-xs font-medium">-4.1%</span>
                        </td>
                        <td className="text-right py-4 text-red-600">📉</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 text-center">
                  <span className="confidential-badge">CONFIDENTIAL - SEGMENT INTELLIGENCE</span>
                </div>
              </CardContent>
            </Card>
            
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="Stock Price"
                value={`$${priceData.price.toFixed(2)}`}
                change={`${priceData.changePercent > 0 ? '+' : ''}${priceData.changePercent.toFixed(2)}%`}
                trend={priceData.changePercent > 0 ? "up" : priceData.changePercent < 0 ? "down" : "neutral"}
                subtitle="Real-time price"
              />
              <MetricCard
                title="Market Cap"
                value={priceData.marketCap > 0 ? `$${(priceData.marketCap / 1e9).toFixed(1)}B` : 'N/A'}
                change={`$${priceData.change.toFixed(2)}`}
                trend={priceData.change > 0 ? "up" : priceData.change < 0 ? "down" : "neutral"}
                subtitle="Market capitalization"
              />
              <MetricCard
                title="P/E Ratio"
                value={priceData.peRatio ? priceData.peRatio.toFixed(1) : 'N/A'}
                change="TTM"
                trend="neutral"
                subtitle="Price to earnings"
              />
              <MetricCard
                title="Volume"
                value={`${(priceData.volume / 1e6).toFixed(1)}M`}
                change={priceData.avgVolume > 0 ? `${priceData.volumeVsAvg > 0 ? '+' : ''}${priceData.volumeVsAvg.toFixed(0)}%` : "vs avg"}
                trend={priceData.volumeVsAvg > 0 ? "up" : priceData.volumeVsAvg < 0 ? "down" : "neutral"}
                subtitle="Trading volume"
              />
            </div>
          </section>

          {/* Charts Section */}
          <section className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border border-border bg-card">
                <div className="flex items-center justify-between p-4 border-b">
                  <span className="confidential-badge">CONFIDENTIAL</span>
                  <span className="intel-badge">CHART-001</span>
                </div>
                <CardHeader>
                  <div className="flex items-center mb-2">
                    <span className="classification-header">REVENUE TRAJECTORY</span>
                  </div>
                  <p className="text-sm text-muted-foreground font-mono">Quarterly performance metrics [USD Billions]</p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="quarter" 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "14px"
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={3}
                        dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: "hsl(var(--primary))", strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border border-border bg-card">
                <div className="flex items-center justify-between p-4 border-b">
                  <span className="confidential-badge">CONFIDENTIAL</span>
                  <span className="intel-badge">CHART-002</span>
                </div>
                <CardHeader>
                  <div className="flex items-center mb-2">
                    <span className="classification-header">SEGMENT ANALYSIS</span>
                  </div>
                  <p className="text-sm text-muted-foreground font-mono">Q4-2024 revenue distribution [USD Billions]</p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={segmentData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
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
                          fontSize: "14px"
                        }}
                        formatter={(value: any) => [`$${value}B`, 'Revenue']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {segmentData.map((segment, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: segment.color }}
                        />
                        <span className="text-sm font-medium">{segment.name}</span>
                        <span className="text-sm text-muted-foreground">${segment.value}B</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border bg-card lg:col-span-2">
                <div className="flex items-center justify-between p-4 border-b">
                  <span className="confidential-badge">CONFIDENTIAL</span>
                  <span className="intel-badge">CHART-003</span>
                </div>
                <CardHeader>
                  <div className="flex items-center mb-2">
                    <span className="classification-header">MARGIN ANALYSIS</span>
                  </div>
                  <p className="text-sm text-muted-foreground font-mono">Gross and operating margin trends (%) - CLASSIFIED</p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={marginData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="quarter" 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "14px"
                        }}
                        formatter={(value: any) => [`${value}%`, '']}
                      />
                      <Bar dataKey="gross" fill="hsl(var(--chart-1))" name="Gross Margin" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="operating" fill="hsl(var(--chart-2))" name="Operating Margin" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="bg-surface border-t border-border mt-16">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground font-mono">
                © 2024 Financial Analytics Dashboard. Powered by AI-driven insights.
              </p>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground font-mono">
                <span>Last updated: 5 minutes ago</span>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                  <span>Live data</span>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // Compact widget view - exact confidential brief aesthetic from screenshots
  return (
    <div 
      className="border border-border bg-card rounded-lg shadow-lg hover-lift transition-all duration-300 cursor-pointer animate-fade-in"
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
              <Apple className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold font-mono tracking-wider text-lg">{companyName.toUpperCase()}. [{symbol}]</h3>
              <p className="text-xs text-muted-foreground font-mono">TARGET: NASDAQ:{symbol}</p>
              <div className="mt-1">
                <InlineCompanySelector
                  currentSymbol={symbol}
                  currentCompanyName={companyName}
                  onCompanyChange={handleCompanyChange}
                  className="text-xs h-5"
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

        {/* Target Profile Section */}
        <div className="target-profile p-3 rounded-lg">
          <div className="flex items-center mb-2">
            <span className="classification-header">TARGET PROFILE</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div>
              <span className="text-muted-foreground">SECTOR:</span>
              <span className="ml-1 font-semibold">TECHNOLOGY</span>
            </div>
            <div>
              <span className="text-muted-foreground">INDUSTRY:</span>
              <span className="ml-1 font-semibold">CONSUMER ELECTRONICS</span>
            </div>
            <div>
              <span className="text-muted-foreground">HQ:</span>
              <span className="ml-1 font-semibold">CUPERTINO, CA</span>
            </div>
            <div>
              <span className="text-muted-foreground">PERSONNEL:</span>
              <span className="ml-1 font-semibold">161,000+</span>
            </div>
            <div>
              <span className="text-muted-foreground">ESTABLISHED:</span>
              <span className="ml-1 font-semibold">1976-04-01</span>
            </div>
            <div>
              <span className="text-muted-foreground">DOMAIN:</span>
              <span className="ml-1 font-semibold">apple.com</span>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-4 gap-2">
          <div className={`rounded-lg p-2 border text-center ${priceData.changePercent >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <p className={`text-xs font-medium font-mono ${priceData.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>PRICE</p>
            <p className="text-sm font-bold font-mono">${priceData.price.toFixed(2)}</p>
            <p className={`text-xs font-mono ${priceData.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {priceData.changePercent > 0 ? '+' : ''}{priceData.changePercent.toFixed(2)}%
            </p>
          </div>
          <div className="bg-slate-50 rounded-lg p-2 border border-slate-200 text-center">
            <p className="text-xs font-medium font-mono text-slate-600">P/E</p>
            <p className="text-sm font-bold font-mono">
              {priceData.peRatio ? priceData.peRatio.toFixed(1) : 'N/A'}
            </p>
            <p className="text-xs font-mono text-slate-500">Ratio</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-2 border border-slate-200 text-center">
            <p className="text-xs font-medium font-mono text-slate-600">BETA</p>
            <p className="text-sm font-bold font-mono">
              {priceData.beta ? priceData.beta.toFixed(2) : 'N/A'}
            </p>
            <p className="text-xs font-mono text-slate-500">Vol</p>
          </div>
          <div className={`rounded-lg p-2 border text-center ${priceData.volumeVsAvg > 0 ? 'bg-green-50 border-green-200' : priceData.volumeVsAvg < 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'}`}>
            <p className={`text-xs font-medium font-mono ${priceData.volumeVsAvg > 0 ? 'text-green-600' : priceData.volumeVsAvg < 0 ? 'text-red-600' : 'text-slate-600'}`}>VOLUME</p>
            <p className="text-sm font-bold font-mono">{(priceData.volume / 1e6).toFixed(1)}M</p>
            <p className={`text-xs font-mono ${priceData.volumeVsAvg > 0 ? 'text-green-600' : priceData.volumeVsAvg < 0 ? 'text-red-600' : 'text-slate-500'}`}>
              {priceData.avgVolume > 0 ? `${priceData.volumeVsAvg > 0 ? '+' : ''}${priceData.volumeVsAvg.toFixed(0)}%` : 'vs avg'}
            </p>
          </div>
        </div>
        
        {/* Footer Badge */}
        <div className="text-center">
          <span className="confidential-badge">CONFIDENTIAL - FINANCIAL INTELLIGENCE</span>
        </div>
      </div>
    </div>
  );
}