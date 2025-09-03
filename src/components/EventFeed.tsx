import { Event } from '../types/event';
import { Clock, ExternalLink, TrendingUp, TrendingDown, Minus, Quote } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface EventFeedProps {
  events: Event[];
  onEventSelect: (event: Event) => void;
  selectedEvent: Event | null;
}

export function EventFeed({ events, onEventSelect, selectedEvent }: EventFeedProps) {
  const getImpactIcon = (impact: Event['impact']) => {
    switch (impact) {
      case 'high':
        return <TrendingUp className="h-4 w-4 text-impact-high" />;
      case 'medium':
        return <Minus className="h-4 w-4 text-impact-medium" />;
      case 'low':
        return <TrendingDown className="h-4 w-4 text-impact-low" />;
    }
  };

  const getCategoryColor = (category: Event['category']) => {
    return `hsl(var(--category-${category}))`;
  };

  const getConfidenceColor = (confidence: Event['confidence']) => {
    return `hsl(var(--confidence-${confidence}))`;
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(timestamp).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffHours >= 24) {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } else if (diffHours >= 1) {
      return `${diffHours}h ago`;
    } else {
      return `${diffMinutes}m ago`;
    }
  };

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No events found matching your criteria.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          Market Events ({events.length})
        </h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          Live updates
        </div>
      </div>

      <div className="space-y-3">
        {events.map((event) => (
          <Card
            key={event.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedEvent?.id === event.id 
                ? 'border-primary shadow-data' 
                : 'border-border hover:border-border/60'
            }`}
            onClick={() => onEventSelect(event)}
          >
            <div className="p-4">
              <div className="flex items-start gap-3">
                {/* Category indicator */}
                <div 
                  className="w-1 h-full min-h-[60px] rounded-full flex-shrink-0"
                  style={{ backgroundColor: getCategoryColor(event.category) }}
                />

                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className="font-mono text-xs bg-surface border-border"
                      >
                        {event.ticker}
                      </Badge>
                      <span 
                        className="text-xs px-2 py-1 rounded-full text-white font-medium"
                        style={{ backgroundColor: getCategoryColor(event.category) }}
                      >
                        {event.category}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getImpactIcon(event.impact)}
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: getConfidenceColor(event.confidence) }}
                        title={`${event.confidence} confidence`}
                      />
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold text-foreground mb-2 line-clamp-2">
                    {event.title}
                  </h3>

                  {/* Summary */}
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {event.summary}
                  </p>

                  {/* Quote Preview for Media Appearances */}
                  {event.category === 'media_appearance' && event.quotes && event.quotes.length > 0 && (
                    <div className="mb-3 p-2 bg-surface rounded border-l-2 border-primary/30">
                      <div className="flex items-start gap-2">
                        <Quote className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground italic line-clamp-2">
                            "{event.quotes[0].text}"
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            — {event.quotes[0].speaker}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {getTimeAgo(event.timestamp)}
                      </div>
                      <div className="flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" />
                        {event.source}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <span className="text-xs">
                        {event.confidence} confidence
                      </span>
                      <span className="text-xs">
                        • {event.impact} impact
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}