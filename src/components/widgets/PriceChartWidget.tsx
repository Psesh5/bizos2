import { WidgetProps } from '@/types/widget';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Mock chart data
const generateMockData = () => {
  const data = [];
  let price = 150;
  
  for (let i = 0; i < 30; i++) {
    price += (Math.random() - 0.5) * 5;
    data.push({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      price: price,
    });
  }
  
  return data;
};

export const PriceChartWidget = ({ widget }: WidgetProps) => {
  const symbol = widget.config?.symbol || 'AAPL';
  const data = generateMockData();

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-gray-600">
        {symbol} - 30 Day Chart
      </div>
      
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis 
              tick={{ fontSize: 10 }}
              domain={['dataMin - 5', 'dataMax + 5']}
            />
            <Tooltip 
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Line 
              type="monotone" 
              dataKey="price" 
              stroke="#2563eb" 
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};