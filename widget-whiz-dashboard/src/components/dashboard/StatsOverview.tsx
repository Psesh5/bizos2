import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Satellite, Clock, Shield } from "lucide-react";

const StatsOverview = () => {
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

export default StatsOverview;