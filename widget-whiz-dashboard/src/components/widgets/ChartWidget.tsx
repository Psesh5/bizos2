import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

interface ChartWidgetProps {
  title: string;
  data: Array<{
    name: string;
    value: number;
  }>;
  color?: string;
}

const chartConfig = {
  value: {
    label: "Value",
    color: "hsl(var(--chart-1))",
  },
};

export function ChartWidget({ title, data, color = "hsl(var(--chart-1))" }: ChartWidgetProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart data={data}>
            <XAxis 
              dataKey="name" 
              tick={false}
              axisLine={false}
            />
            <YAxis hide />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area 
              dataKey="value" 
              type="monotone" 
              fill={color}
              fillOpacity={0.4}
              stroke={color}
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}