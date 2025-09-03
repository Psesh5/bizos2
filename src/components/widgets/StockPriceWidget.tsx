import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { WidgetProps, StockPriceData } from '@/types/widget';

// Mock API call
const fetchStockPrice = async (symbol: string): Promise<StockPriceData> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock data for now
  const mockPrice = 150 + Math.random() * 50;
  const mockChange = (Math.random() - 0.5) * 10;
  
  return {
    symbol: symbol.toUpperCase(),
    price: mockPrice,
    change: mockChange,
    changePercent: (mockChange / mockPrice) * 100,
    timestamp: new Date().toISOString(),
  };
};

export const StockPriceWidget = ({ widget }: WidgetProps) => {
  const symbol = widget.config?.symbol || 'AAPL';
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['stock-price', symbol],
    queryFn: () => fetchStockPrice(symbol),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-pulse flex space-x-4">
          <div className="rounded-full bg-slate-200 h-10 w-10"></div>
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-32 text-red-500">
        Failed to load stock data
      </div>
    );
  }

  if (!data) return null;

  const isPositive = data.change >= 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const colorClass = isPositive ? 'text-green-600' : 'text-red-600';
  const bgColorClass = isPositive ? 'bg-green-50' : 'bg-red-50';

  return (
    <div className="space-y-4">
      {/* Symbol */}
      <div className="text-lg font-bold text-gray-900">
        {data.symbol}
      </div>

      {/* Price */}
      <div className="text-3xl font-bold text-gray-900">
        ${data.price.toFixed(2)}
      </div>

      {/* Change */}
      <div className={`flex items-center gap-2 ${bgColorClass} px-3 py-2 rounded-lg`}>
        <Icon className={`h-4 w-4 ${colorClass}`} />
        <span className={`font-medium ${colorClass}`}>
          {isPositive ? '+' : ''}{data.change.toFixed(2)} ({isPositive ? '+' : ''}{data.changePercent.toFixed(2)}%)
        </span>
      </div>

      {/* Last Updated */}
      <div className="text-xs text-gray-500">
        Last updated: {new Date(data.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
};