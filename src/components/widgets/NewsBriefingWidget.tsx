import { Clock, AlertTriangle, TrendingUp, Building, DollarSign, Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";

interface NewsItem {
  id: string;
  title: string;
  date: string;
  priority: "high" | "medium" | "low";
  category: "market" | "operational" | "contracts" | "capital";
  classification: "UNCLASSIFIED" | "CONFIDENTIAL" | "SECRET";
}

interface NewsBriefingWidgetProps {
  symbol?: string;
  companyName?: string;
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
}

const mockNewsData: NewsItem[] = [
  {
    id: "1",
    title: "Needham Reiterates Buy on Rocket Lab, Maintains $55 Price Target",
    date: "2025-09-03",
    priority: "medium",
    category: "market",
    classification: "UNCLASSIFIED"
  },
  {
    id: "2", 
    title: "What's Going On With Rocket Lab (RKLB) Stock Wednesday?",
    date: "2025-09-03",
    priority: "low",
    category: "market",
    classification: "UNCLASSIFIED"
  },
  {
    id: "3",
    title: "Is the Market Bullish or Bearish on Rocket Lab?",
    date: "2025-09-03",
    priority: "low",
    category: "market",
    classification: "UNCLASSIFIED"
  },
  {
    id: "4",
    title: "Rocket Lab Opens New Virginia Launch Complex To Develop Neutron Reusable Rocket",
    date: "2025-08-29",
    priority: "high",
    category: "operational",
    classification: "UNCLASSIFIED"
  },
  {
    id: "5",
    title: "Space Stock Tracker: Trump Moves Space Command, Rocket Lab Opens Launch Complex 3",
    date: "2025-09-02",
    priority: "high",
    category: "contracts",
    classification: "UNCLASSIFIED"
  },
  {
    id: "6",
    title: "NASA Names Exploration Official as Associate Administrator",
    date: "2025-09-04",
    priority: "medium",
    category: "contracts",
    classification: "UNCLASSIFIED"
  }
];

const categoryIcons = {
  market: TrendingUp,
  operational: Target,
  contracts: Building,
  capital: DollarSign
};

const categoryLabels = {
  market: "MARKET/INVESTOR ACTIVITY",
  operational: "OPERATIONAL MILESTONES", 
  contracts: "CONTRACTS & GOVERNMENT DEALS",
  capital: "CAPITAL ACTIONS"
};

const priorityColors = {
  high: "priority-high",
  medium: "priority-medium", 
  low: "priority-low"
};

export function NewsBriefingWidget({ 
  symbol = "RKLB", 
  companyName = "ROCKET LAB",
  isExpanded = false,
  onToggleExpanded
}: NewsBriefingWidgetProps) {
  const [currentDateTime, setCurrentDateTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      setCurrentDateTime(
        new Date().toLocaleString("en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const groupedNews = mockNewsData.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, NewsItem[]>);

  // Count priorities
  const priorityCounts = mockNewsData.reduce((acc, item) => {
    acc[item.priority] = (acc[item.priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const capitalActionCount = mockNewsData.filter(item => item.category === "capital").length;

  // Compact view for non-expanded state
  if (!isExpanded) {
    return (
      <div 
        className="font-mono cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggleExpanded}
      >
        <style jsx>{`
          .text-priority-high { color: #ef4444; }
          .text-priority-medium { color: #f59e0b; }
          .text-priority-low { color: #3b82f6; }
          .text-terminal-green { color: #22c55e; }
        `}</style>

        {/* Compact Header */}
        <div className="border-l-4 border-primary">
          <div className="bg-primary/10 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-primary" />
              <span className="font-bold text-sm tracking-wider">NEWS BRIEFING</span>
            </div>
            <span className="text-xs text-muted-foreground">{currentDateTime.split(' ')[0]}</span>
          </div>

          {/* Priority Summary */}
          <div className="px-4 py-3 bg-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Intelligence Summary</span>
              <Badge variant="outline" className="text-xs">
                {mockNewsData.length} ITEMS
              </Badge>
            </div>
            
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <div className="text-lg font-bold text-priority-high">{priorityCounts.high || 0}</div>
                <div className="text-[10px] text-muted-foreground">HIGH</div>
              </div>
              <div>
                <div className="text-lg font-bold text-priority-medium">{priorityCounts.medium || 0}</div>
                <div className="text-[10px] text-muted-foreground">MED</div>
              </div>
              <div>
                <div className="text-lg font-bold text-priority-low">{priorityCounts.low || 0}</div>
                <div className="text-[10px] text-muted-foreground">LOW</div>
              </div>
              <div>
                <div className="text-lg font-bold text-terminal-green">{capitalActionCount}</div>
                <div className="text-[10px] text-muted-foreground">CAP</div>
              </div>
            </div>
          </div>

          {/* Latest High Priority Items Preview */}
          <div className="border-t px-4 py-2 space-y-2">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Latest Intel</div>
            {mockNewsData
              .filter(item => item.priority === "high")
              .slice(0, 2)
              .map(item => (
                <div key={item.id} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-priority-high mt-1 flex-shrink-0" />
                  <p className="text-xs leading-tight line-clamp-2">{item.title}</p>
                </div>
              ))}
          </div>

          {/* Click to Expand */}
          <div className="px-4 py-2 text-center border-t bg-muted/50">
            <span className="text-xs text-muted-foreground">CLICK TO VIEW FULL BRIEFING</span>
          </div>
        </div>
      </div>
    );
  }

  // Full expanded view (original design)
  return (
    <div className="font-mono">
      <style jsx>{`
        .bg-classified {
          background-color: hsl(var(--muted));
        }
        .text-priority-high {
          color: #ef4444;
        }
        .text-priority-medium {
          color: #f59e0b;
        }
        .text-priority-low {
          color: #3b82f6;
        }
        .text-terminal-green {
          color: #22c55e;
        }
        .bg-priority-high {
          background-color: #ef4444;
        }
        .bg-priority-medium {
          background-color: #f59e0b;
        }
        .bg-priority-low {
          background-color: #3b82f6;
        }
        .border-priority-high {
          border-color: #ef4444;
        }
        .border-priority-medium {
          border-color: #f59e0b;
        }
        .border-priority-low {
          border-color: #3b82f6;
        }
      `}</style>

      <div className="space-y-6">
        {/* Header */}
        <div className="border-2 border-primary bg-card">
          <div className="bg-primary text-primary-foreground px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-bold tracking-wider">{companyName.toUpperCase()} NEWS BRIEFING</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4" />
              <span>LAST UPDATED: {currentDateTime}</span>
            </div>
          </div>
          
          <div className="p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">CLASSIFICATION:</span>
              <Badge variant="secondary" className="bg-classified text-foreground">
                UNCLASSIFIED
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">SUBJECT:</span>
              <span className="text-foreground">{companyName.toUpperCase()} CORPORATION ({symbol})</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">DATE:</span>
              <span className="text-foreground">{new Date().toISOString().split('T')[0]}</span>
            </div>
          </div>
        </div>

        {/* Status Summary */}
        <Card className="border-2 border-accent">
          <div className="bg-accent text-accent-foreground px-4 py-2">
            <span className="font-bold tracking-wider">INTELLIGENCE SUMMARY</span>
          </div>
          <div className="p-4 grid grid-cols-4 gap-4 text-center">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-priority-high">{priorityCounts.high || 0}</div>
              <div className="text-xs text-muted-foreground">HIGH PRIORITY</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-priority-medium">{priorityCounts.medium || 0}</div>
              <div className="text-xs text-muted-foreground">MEDIUM PRIORITY</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-priority-low">{priorityCounts.low || 0}</div>
              <div className="text-xs text-muted-foreground">LOW PRIORITY</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-terminal-green">{capitalActionCount}</div>
              <div className="text-xs text-muted-foreground">CAPITAL ACTIONS</div>
            </div>
          </div>
        </Card>

        {/* News Categories */}
        {Object.entries(groupedNews).map(([category, items]) => {
          const Icon = categoryIcons[category as keyof typeof categoryIcons];
          
          return (
            <Card key={category} className="border-2 border-muted">
              <div className="bg-muted text-muted-foreground px-4 py-2 flex items-center gap-2">
                <Icon className="w-4 h-4" />
                <span className="font-bold tracking-wider">
                  {categoryLabels[category as keyof typeof categoryLabels]}
                </span>
              </div>
              
              <div className="divide-y divide-border">
                {items.map((item) => (
                  <div key={item.id} className="p-4 flex items-start gap-4">
                    <div className={`w-2 h-2 rounded-full bg-${priorityColors[item.priority]} mt-2 flex-shrink-0`} />
                    
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="text-foreground font-medium leading-tight">
                          {item.title}
                        </h3>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge 
                            variant="outline" 
                            className={`text-xs border-${priorityColors[item.priority]} text-${priorityColors[item.priority]}`}
                          >
                            {item.priority.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>DATE: {item.date}</span>
                        <span>CLASS: {item.classification}</span>
                        <span>ID: {item.id.padStart(4, '0')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}

        {/* Footer */}
        <div className="border border-border p-4 bg-card text-center">
          <div className="text-xs text-muted-foreground space-y-1">
            <div>CLASSIFICATION: UNCLASSIFIED</div>
            <div>DISTRIBUTION: AUTHORIZED PERSONNEL ONLY</div>
            <div>GENERATED: {currentDateTime} UTC</div>
          </div>
        </div>
      </div>
    </div>
  );
}