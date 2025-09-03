import { Event } from '../types/event';
import { X, ExternalLink, Clock, TrendingUp, TrendingDown, Minus, HelpCircle, Quote, Play, Headphones } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface EventDetailProps {
  event: Event;
  onClose: () => void;
}

export function EventDetail({ event, onClose }: EventDetailProps) {
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

  const getMediaIcon = (mediaType: string) => {
    switch (mediaType) {
      case 'tv':
        return <Play className="h-3 w-3" />;
      case 'podcast':
        return <Headphones className="h-3 w-3" />;
      default:
        return <ExternalLink className="h-3 w-3" />;
    }
  };

  return (
    <Card className="sticky top-6 border-border bg-surface-elevated">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
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
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-foreground mb-3 leading-tight">
          {event.title}
        </h3>

        {/* Metrics */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1">
            {getImpactIcon(event.impact)}
            <span className="text-xs font-medium capitalize">
              {event.impact} Impact
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            <div 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: getConfidenceColor(event.confidence) }}
            />
            <span className="text-xs font-medium capitalize">
              {event.confidence} Confidence
            </span>
          </div>
          
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span className="text-xs">
              {getTimeAgo(event.timestamp)}
            </span>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Summary */}
        <div className="mb-4">
          <h4 className="text-sm font-medium text-foreground mb-2">Summary</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {event.summary}
          </p>
        </div>

        {/* Executive Quotes for Media Appearances */}
        {event.category === 'media_appearance' && event.quotes && event.quotes.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Quote className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-medium text-foreground">
                Key Quotes
              </h4>
            </div>
            <div className="space-y-3">
              {event.quotes.map((quote, index) => (
                <div key={index} className="p-3 bg-surface rounded-md border border-border">
                  <blockquote className="text-sm text-foreground italic leading-relaxed mb-2">
                    "{quote.text}"
                  </blockquote>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div>
                      <span className="font-medium">
                        {quote.speaker}{quote.title && `, ${quote.title}`}
                      </span>
                      {quote.context && (
                        <span className="block mt-1">
                          {quote.context}
                        </span>
                      )}
                    </div>
                    {quote.mediaType && quote.mediaLink && (
                      <a
                        href={quote.mediaLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:text-primary/80"
                      >
                        {getMediaIcon(quote.mediaType)}
                        <span>{quote.mediaType}</span>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Explanation */}
        {event.explanation && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <HelpCircle className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-medium text-foreground">
                Why This Matters
              </h4>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {event.explanation}
            </p>
          </div>
        )}

        {/* Watch Phrases */}
        {event.watchPhrases && event.watchPhrases.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-foreground mb-2">
              Key Phrases
            </h4>
            <div className="flex flex-wrap gap-1">
              {event.watchPhrases.map((phrase, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="text-xs bg-surface border-border"
                >
                  {phrase}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Separator className="my-4" />

        {/* Source */}
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-medium text-foreground mb-1">Source</h4>
            <p className="text-sm text-muted-foreground">{event.source}</p>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={() => window.open(event.sourceUrl, '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View Original Source
          </Button>
        </div>
      </div>
    </Card>
  );
}