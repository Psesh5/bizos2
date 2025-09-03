import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Calendar, BarChart3, DollarSign, Newspaper, MessageSquare, Radar } from 'lucide-react';

interface WidgetLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWidget: (type: string, title: string) => void;
}

const WIDGET_TEMPLATES = [
  {
    type: 'stock-price',
    title: 'Stock Price',
    description: 'Real-time stock price and daily change',
    icon: TrendingUp,
    category: 'Financial',
  },
  {
    type: 'price-chart',
    title: 'Price Chart',
    description: 'Interactive stock price chart with indicators',
    icon: BarChart3,
    category: 'Financial',
  },
  {
    type: 'financial-metrics',
    title: 'Financial Metrics',
    description: 'Key financial ratios and metrics',
    icon: DollarSign,
    category: 'Financial',
  },
  {
    type: 'earnings-calendar',
    title: 'Earnings Calendar',
    description: 'Upcoming earnings dates and estimates',
    icon: Calendar,
    category: 'Financial',
  },
  {
    type: 'news-feed',
    title: 'News Feed',
    description: 'Latest company and market news',
    icon: Newspaper,
    category: 'News',
  },
  {
    type: 'earnings-transcripts',
    title: 'Earnings Transcripts',
    description: 'AI analysis of earnings call transcripts',
    icon: MessageSquare,
    category: 'AI Analysis',
  },
  {
    type: 'price-move-radar',
    title: 'Price-Move Radar',
    description: 'Track events that move stock prices',
    icon: Radar,
    category: 'Intelligence',
  },
];

export const WidgetLibrary = ({ isOpen, onClose, onAddWidget }: WidgetLibraryProps) => {
  const categories = Array.from(new Set(WIDGET_TEMPLATES.map(w => w.category)));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Widget Library</DialogTitle>
          <DialogDescription>
            Choose widgets to add to your dashboard
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {categories.map((category) => (
            <div key={category}>
              <h3 className="text-lg font-semibold mb-3 text-gray-900">{category}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {WIDGET_TEMPLATES
                  .filter(widget => widget.category === category)
                  .map((widget) => {
                    const Icon = widget.icon;
                    return (
                      <Card key={widget.type} className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardHeader className="pb-4">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <Icon className="h-5 w-5 text-blue-600" />
                            </div>
                            <CardTitle className="text-sm">{widget.title}</CardTitle>
                          </div>
                          <CardDescription className="text-xs">
                            {widget.description}
                          </CardDescription>
                          <Button
                            size="sm"
                            onClick={() => onAddWidget(widget.type, widget.title)}
                            className="mt-3 w-full"
                          >
                            Add Widget
                          </Button>
                        </CardHeader>
                      </Card>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};