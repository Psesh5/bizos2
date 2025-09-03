import { WidgetProps } from '@/types/widget';

interface MetricProps {
  label: string;
  value: string;
  change?: string;
  isPositive?: boolean;
}

const Metric = ({ label, value, change, isPositive }: MetricProps) => (
  <div className="bg-gray-50 p-3 rounded-lg">
    <div className="text-xs text-gray-600 mb-1">{label}</div>
    <div className="font-semibold text-gray-900">{value}</div>
    {change && (
      <div className={`text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? '+' : ''}{change}
      </div>
    )}
  </div>
);

export const FinancialMetricsWidget = ({ widget }: WidgetProps) => {
  const symbol = widget.config?.symbol || 'AAPL';

  // Mock financial data
  const metrics = [
    { label: 'Market Cap', value: '$2.8T', change: '+2.1%', isPositive: true },
    { label: 'P/E Ratio', value: '28.5', change: '-0.5%', isPositive: false },
    { label: 'EPS', value: '$6.16', change: '+15.2%', isPositive: true },
    { label: 'Revenue', value: '$394.3B', change: '+8.1%', isPositive: true },
    { label: 'Profit Margin', value: '25.3%', change: '+1.2%', isPositive: true },
    { label: 'ROE', value: '175.1%', change: '+12.3%', isPositive: true },
  ];

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-gray-600">
        {symbol} - Key Metrics
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {metrics.map((metric, index) => (
          <Metric key={index} {...metric} />
        ))}
      </div>
    </div>
  );
};