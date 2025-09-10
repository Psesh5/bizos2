import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, TrendingUp, AlertTriangle, Activity, Satellite, Clock, X, TrendingDown, Shield } from "lucide-react";
import { WidgetProps } from "@/types/widget";
import { cn } from "@/lib/utils";

interface Alert {
  id: string;
  triggerName: string;
  description: string;
  severity: "Critical" | "Warning" | "Info";
  timestamp: string;
  metric: string;
  currentValue: string;
  threshold: string;
  trend: "up" | "down" | "neutral";
  dataSource: string;
}

const mockActiveAlerts: Alert[] = [
  {
    id: "1",
    triggerName: "Earnings Surprise",
    description: "Q3 EPS missed consensus estimate by 15% ($0.45 vs $0.53 expected)",
    severity: "Critical",
    timestamp: "2 hours ago",
    metric: "EPS vs Estimate",
    currentValue: "$0.45",
    threshold: "$0.53 expected",
    trend: "down",
    dataSource: "FMP",
  },
  {
    id: "2",
    triggerName: "Cash Position Alert",
    description: "Cash reserves declined 28% QoQ, approaching 5 months runway",
    severity: "Critical",
    timestamp: "4 hours ago",
    metric: "Cash & Equivalents",
    currentValue: "$12.5M",
    threshold: "25% decline threshold",
    trend: "down",
    dataSource: "FMP",
  },
  {
    id: "3",
    triggerName: "Stock Price Volatility",
    description: "Intraday price swing of 7.2% triggered volatility alert",
    severity: "Warning",
    timestamp: "6 hours ago",
    metric: "Daily Price Change",
    currentValue: "7.2%",
    threshold: ">5% intraday",
    trend: "up",
    dataSource: "Polygon",
  },
  {
    id: "4",
    triggerName: "Volume Spike Detection",
    description: "Trading volume 340% above 30-day average",
    severity: "Warning",
    timestamp: "8 hours ago",
    metric: "Trading Volume",
    currentValue: "2.1M shares",
    threshold: "200% of average",
    trend: "up",
    dataSource: "Polygon",
  },
  {
    id: "5",
    triggerName: "Insider Trading Alert",
    description: "CFO sold 25,000 shares ($850K) - largest sale in 6 months",
    severity: "Info",
    timestamp: "1 day ago",
    metric: "Insider Transactions",
    currentValue: "$850K sale",
    threshold: ">$100K threshold",
    trend: "neutral",
    dataSource: "FMP",
  },
  {
    id: "6",
    triggerName: "Peer Performance Gap",
    description: "Stock underperforming sector by 18% over 30 days",
    severity: "Info",
    timestamp: "2 days ago",
    metric: "Relative Performance",
    currentValue: "-18% vs peers",
    threshold: "15% underperformance",
    trend: "down",
    dataSource: "Polygon",
  },
];

interface AlertCardProps {
  alert: Alert;
  onDismiss?: (id: string) => void;
  compact?: boolean;
}

const AlertCard = ({ alert, onDismiss, compact = false }: AlertCardProps) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "Critical":
        return "bg-destructive text-destructive-foreground";
      case "Warning":
        return "bg-warning text-white";
      case "Info":
        return "bg-info text-white";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case "FMP":
        return "bg-chart-1 text-white";
      case "Polygon":
        return "bg-chart-4 text-white";
      default:
        return "bg-chart-2 text-white";
    }
  };

  const TrendIcon = alert.trend === "up" ? TrendingUp : alert.trend === "down" ? TrendingDown : Clock;

  if (compact) {
    return (
      <div className="flex items-center justify-between p-2 border rounded-md bg-background/50">
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          <AlertTriangle className="w-3 h-3 text-warning flex-shrink-0" />
          <span className="text-xs font-medium truncate">{alert.triggerName}</span>
          <Badge className={cn("text-xs px-1 py-0", getSeverityColor(alert.severity))}>
            {alert.severity.charAt(0)}
          </Badge>
        </div>
        <TrendIcon className={cn("w-3 h-3 flex-shrink-0", 
          alert.trend === "up" ? "text-chart-2" : 
          alert.trend === "down" ? "text-destructive" : "text-muted-foreground"
        )} />
      </div>
    );
  }

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <CardTitle className="text-base">{alert.triggerName}</CardTitle>
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDismiss(alert.id)}
                className="ml-auto h-6 w-6 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2 pt-1">
          <Badge className={cn("text-xs", getSeverityColor(alert.severity))}>
            {alert.severity}
          </Badge>
          <Badge variant="outline" className={cn("text-xs", getSourceColor(alert.dataSource))}>
            {alert.dataSource}
          </Badge>
          <span className="text-xs text-muted-foreground flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            {alert.timestamp}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">{alert.description}</p>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-foreground">Current:</span>
            <div className="flex items-center space-x-1 mt-1">
              <TrendIcon className={cn("w-4 h-4", 
                alert.trend === "up" ? "text-chart-2" : 
                alert.trend === "down" ? "text-destructive" : "text-muted-foreground"
              )} />
              <span className="font-mono">{alert.currentValue}</span>
            </div>
          </div>
          <div>
            <span className="font-medium text-foreground">Threshold:</span>
            <p className="font-mono mt-1">{alert.threshold}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface StatsOverviewProps {
  compact?: boolean;
}

const StatsOverview = ({ compact = false }: StatsOverviewProps) => {
  const stats = [
    {
      title: "Active Alerts",
      value: "7",
      change: "+2 from yesterday",
      icon: AlertTriangle,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Critical Issues",
      value: "2",
      change: "Earnings & Cash Flow",
      icon: Shield,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      title: "Response Time",
      value: "< 1min",
      change: "Real-time monitoring",
      icon: Clock,
      color: "text-chart-2",
      bgColor: "bg-chart-2/10",
    },
    {
      title: "Mission Status",
      value: "NOMINAL",
      change: "All systems operational",
      icon: Satellite,
      color: "text-success",
      bgColor: "bg-success/10",
    },
  ];

  if (compact) {
    return (
      <div className="grid grid-cols-2 gap-2 mb-4">
        {stats.slice(0, 4).map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.title} className="flex items-center space-x-2 p-2 bg-background/50 rounded-md border">
              <div className={`p-1.5 rounded-md ${stat.bgColor}`}>
                <Icon className={`w-3 h-3 ${stat.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground truncate">{stat.title}</div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-md ${stat.bgColor}`}>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

interface IntelligenceHubWidgetProps extends WidgetProps {
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
}

export const IntelligenceHubWidget = ({ 
  widget, 
  onUpdate, 
  onRemove, 
  isExpanded = false, 
  onToggleExpanded 
}: IntelligenceHubWidgetProps) => {
  const [alerts, setAlerts] = useState(mockActiveAlerts);

  const handleDismissAlert = (alertId: string) => {
    setAlerts(alerts.filter(alert => alert.id !== alertId));
  };

  const criticalAlerts = alerts.filter(alert => alert.severity === "Critical");
  const warningAlerts = alerts.filter(alert => alert.severity === "Warning");
  const infoAlerts = alerts.filter(alert => alert.severity === "Info");

  // Mobile/Compact view (Lovable-style mobile view)
  if (!isExpanded) {
    return (
      <div className="h-full">
        {/* Compact Header */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-foreground font-mono tracking-wider">INTEL HUB</h3>
            <div className="flex items-center space-x-1">
              <Badge variant="outline" className="bg-success/10 text-success border-success/20 font-mono text-xs px-1 py-0 animate-pulse">
                <Activity className="w-2 h-2 mr-1" />
                ONLINE
              </Badge>
              {onToggleExpanded && (
                <Button variant="ghost" size="sm" onClick={onToggleExpanded} className="h-6 w-6 p-0">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <polyline points="15,3 21,3 21,9" />
                    <polyline points="9,21 3,21 3,15" />
                    <line x1="21" y1="3" x2="14" y2="10" />
                    <line x1="3" y1="21" x2="10" y2="14" />
                  </svg>
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground font-mono">
            {new Date().getFullYear()}.{String(new Date().getMonth() + 1).padStart(2, '0')}.{String(new Date().getDate()).padStart(2, '0')}
          </p>
        </div>

        {/* Compact Stats */}
        <StatsOverview compact />

        {/* Compact Alert Summary */}
        <div className="space-y-3">
          {/* Critical Alerts - Always show if any */}
          {criticalAlerts.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-medium text-destructive font-mono flex items-center">
                  <AlertTriangle className="w-3 h-3 mr-1 animate-pulse" />
                  CRITICAL ({criticalAlerts.length})
                </h4>
              </div>
              <div className="space-y-1">
                {criticalAlerts.slice(0, 2).map((alert) => (
                  <AlertCard key={alert.id} alert={alert} onDismiss={handleDismissAlert} compact />
                ))}
              </div>
            </div>
          )}

          {/* Warning Alerts - Show top 2 */}
          {warningAlerts.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-medium text-warning font-mono flex items-center">
                  <Bell className="w-3 h-3 mr-1" />
                  TACTICAL ({warningAlerts.length})
                </h4>
              </div>
              <div className="space-y-1">
                {warningAlerts.slice(0, 1).map((alert) => (
                  <AlertCard key={alert.id} alert={alert} onDismiss={handleDismissAlert} compact />
                ))}
                {warningAlerts.length > 1 && (
                  <div className="text-xs text-muted-foreground text-center py-1">
                    +{warningAlerts.length - 1} more warnings
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Info summary */}
          {infoAlerts.length > 0 && (
            <div className="text-xs text-muted-foreground text-center py-1 font-mono">
              <Satellite className="w-3 h-3 inline mr-1" />
              {infoAlerts.length} INTEL REPORTS
            </div>
          )}

          {/* Expand button */}
          {onToggleExpanded && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onToggleExpanded}
              className="w-full text-xs font-mono tracking-wide hover:bg-chart-1/10 hover:border-chart-1/30"
            >
              VIEW FULL INTEL HUB
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Expanded/Desktop view (full widget-whiz-dashboard experience)
  return (
    <div className="h-full overflow-auto">
      <div className="p-4 space-y-6 min-h-full bg-gradient-to-br from-background via-muted to-background"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 50%, hsl(var(--chart-1) / 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, hsl(var(--destructive) / 0.1) 0%, transparent 50%),
            radial-gradient(circle at 40% 80%, hsl(var(--chart-1) / 0.05) 0%, transparent 50%)
          `
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground font-mono tracking-wider">INTELLIGENCE HUB</h1>
            <p className="text-muted-foreground mt-1 font-mono text-sm tracking-wide">
              Financial Intelligence Operations • Classification Level: {new Date().getFullYear()}.{String(new Date().getMonth() + 1).padStart(2, '0')}.{String(new Date().getDate()).padStart(2, '0')}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant="outline" className="bg-success/10 text-success border-success/20 font-mono animate-pulse tracking-wide">
              <Activity className="w-3 h-3 mr-1" />
              SYSTEMS ONLINE
            </Badge>
            <Badge variant="outline" className="bg-chart-1/10 text-chart-1 border-chart-1/20 font-mono tracking-wide">
              <Satellite className="w-3 h-3 mr-1" />
              BLACKBOX ACTIVE
            </Badge>
            {onToggleExpanded && (
              <Button variant="ghost" size="sm" onClick={onToggleExpanded} className="h-8 w-8 p-0">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <polyline points="4,14 10,14 10,20" />
                  <polyline points="20,10 14,10 14,4" />
                  <line x1="14" y1="10" x2="21" y2="3" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              </Button>
            )}
          </div>
        </div>

        {/* Stats Overview */}
        <StatsOverview />

        {/* Active Alerts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Critical Alerts */}
          <Card className="border-destructive/20 bg-gradient-to-br from-background to-destructive/5">
            <CardHeader>
              <CardTitle className="flex items-center text-destructive font-mono">
                <AlertTriangle className="w-5 h-5 mr-2 animate-pulse" />
                CRITICAL THREATS ({criticalAlerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {criticalAlerts.length > 0 ? (
                criticalAlerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onDismiss={handleDismissAlert}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No critical alerts</p>
              )}
            </CardContent>
          </Card>

          {/* Warning Alerts */}
          <Card className="border-warning/20 bg-gradient-to-br from-background to-warning/5">
            <CardHeader>
              <CardTitle className="flex items-center text-warning font-mono">
                <Bell className="w-5 h-5 mr-2" />
                TACTICAL ALERTS ({warningAlerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {warningAlerts.length > 0 ? (
                warningAlerts.slice(0, 3).map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onDismiss={handleDismissAlert}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No warning alerts</p>
              )}
              {warningAlerts.length > 3 && (
                <Button variant="outline" className="w-full" size="sm">
                  View {warningAlerts.length - 3} more warnings
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Info Alerts */}
          <Card className="border-info/20 bg-gradient-to-br from-background to-info/5">
            <CardHeader>
              <CardTitle className="flex items-center text-info font-mono">
                <Satellite className="w-5 h-5 mr-2" />
                INTEL REPORTS ({infoAlerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {infoAlerts.length > 0 ? (
                infoAlerts.slice(0, 2).map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onDismiss={handleDismissAlert}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No info alerts</p>
              )}
              {infoAlerts.length > 2 && (
                <Button variant="outline" className="w-full" size="sm">
                  View {infoAlerts.length - 2} more alerts
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Command Center */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground font-mono tracking-wider">OPERATIONS COMMAND</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" className="hover:bg-chart-1/10 hover:border-chart-1/30 font-mono tracking-wide">
                <Bell className="w-4 h-4 mr-2" />
                ALL THREATS
              </Button>
              <Button variant="outline" className="hover:bg-success/10 hover:border-success/30 font-mono tracking-wide">
                <Activity className="w-4 h-4 mr-2" />
                SYSTEM STATUS
              </Button>
              <Button variant="outline" className="hover:bg-info/10 hover:border-info/30 font-mono tracking-wide">
                <Satellite className="w-4 h-4 mr-2" />
                INTEL REPORT
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};