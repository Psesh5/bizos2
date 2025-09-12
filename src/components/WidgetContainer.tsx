import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, X, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BaseWidget, WidgetProps } from '@/types/widget';
import { StockPriceWidget } from './widgets/StockPriceWidget';
import { PriceChartWidget } from './widgets/PriceChartWidget';
import { FinancialMetricsWidget } from './widgets/FinancialMetricsWidget';
import { PriceMoveRadarWidget } from './widgets/PriceMoveRadarWidget';
import { CompanyIntelBriefWidget } from './widgets/CompanyIntelBriefWidget';
import { NewsBriefingWidget } from './widgets/NewsBriefingWidget';
import { IntelligenceHubWidget } from './widgets/IntelligenceHubWidget';
import { AIAgentBuilderWidget } from './widgets/AIAgentBuilderWidget';
import { AbnormalEventSequencerWidget } from './widgets/AbnormalEventSequencerWidget';
import { DocumentIntelligenceStationWidget } from './widgets/DocumentIntelligenceStationWidget';

interface WidgetContainerProps {
  widget: BaseWidget;
  onUpdate: (config: Record<string, any>) => void;
  onRemove: () => void;
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
}

export const WidgetContainer = ({ widget, onUpdate, onRemove, isExpanded, onToggleExpanded }: WidgetContainerProps) => {
  const renderWidget = () => {
    const widgetProps: WidgetProps = {
      widget,
      onUpdate,
      onRemove,
    };

    switch (widget.type) {
      case 'stock-price':
        return <StockPriceWidget {...widgetProps} />;
      case 'price-chart':
        return <PriceChartWidget {...widgetProps} />;
      case 'financial-metrics':
        return <FinancialMetricsWidget {...widgetProps} />;
      case 'earnings-calendar':
        return <div className="p-4 text-center text-gray-500">Earnings Calendar - Coming Soon</div>;
      case 'news-feed':
        return <div className="p-4 text-center text-gray-500">News Feed - Coming Soon</div>;
      case 'earnings-transcripts':
        return <div className="p-4 text-center text-gray-500">Earnings Transcripts - Coming Soon</div>;
      case 'price-move-radar':
        return <PriceMoveRadarWidget {...widgetProps} isExpanded={isExpanded} onToggleExpanded={onToggleExpanded} />;
      case 'company-intel-brief':
        return <CompanyIntelBriefWidget {...widgetProps} isExpanded={isExpanded} onToggleExpanded={onToggleExpanded} />;
      case 'news-briefing':
        return <NewsBriefingWidget widget={widget} isExpanded={isExpanded} onToggleExpanded={onToggleExpanded} />;
      case 'intelligence-hub':
        return <IntelligenceHubWidget {...widgetProps} isExpanded={isExpanded} onToggleExpanded={onToggleExpanded} />;
      case 'ai-agent-builder':
        return <AIAgentBuilderWidget {...widgetProps} isExpanded={isExpanded} onToggleExpanded={onToggleExpanded} />;
      case 'abnormal-event-sequencer':
        return <AbnormalEventSequencerWidget {...widgetProps} isExpanded={isExpanded} onToggleExpanded={onToggleExpanded} />;
      case 'document-intelligence-station':
        return <DocumentIntelligenceStationWidget {...widgetProps} isExpanded={isExpanded} onToggleExpanded={onToggleExpanded} />;
      default:
        return <div className="p-4 text-center text-gray-500">Unknown widget type</div>;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className={`text-sm font-medium ${
          widget.type === 'company-intel-brief' ? 'font-mono tracking-wider text-red-600 font-bold' : 
          widget.type === 'abnormal-event-sequencer' ? 'font-mono tracking-wider text-green-600 font-bold' :
          widget.type === 'document-intelligence-station' ? 'font-mono tracking-wider text-orange-600 font-bold' : ''
        }`}>{widget.title}</CardTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => console.log('Settings clicked')}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={onRemove}
              className="text-red-600 focus:text-red-600"
            >
              <X className="mr-2 h-4 w-4" />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="pt-0">
        {renderWidget()}
      </CardContent>
    </Card>
  );
};