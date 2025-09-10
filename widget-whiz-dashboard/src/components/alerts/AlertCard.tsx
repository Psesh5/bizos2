import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, TrendingUp, TrendingDown, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AlertCardProps {
  alert: {
    id: string;
    triggerName: string;
    description: string;
    severity: "Critical" | "Warning" | "Info";
    timestamp: string;
    metric: string;
    currentValue: string;
    threshold: string;
    trend: "up" | "down" | "neutral";
    dataSource: string;
  };
  onDismiss?: (id: string) => void;
}

const AlertCard = ({ alert, onDismiss }: AlertCardProps) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "Critical":
        return "bg-destructive text-destructive-foreground";
      case "Warning":
        return "bg-warning text-white";
      case "Info":
        return "bg-info text-white";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case "FMP":
        return "bg-chart-1 text-white";
      case "Polygon":
        return "bg-chart-4 text-white";
      default:
        return "bg-chart-2 text-white";
    }
  };

  const TrendIcon = alert.trend === "up" ? TrendingUp : alert.trend === "down" ? TrendingDown : Clock;

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <CardTitle className="text-base">{alert.triggerName}</CardTitle>
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDismiss(alert.id)}
                className="ml-auto h-6 w-6 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2 pt-1">
          <Badge className={cn("text-xs", getSeverityColor(alert.severity))}>
            {alert.severity}
          </Badge>
          <Badge variant="outline" className={cn("text-xs", getSourceColor(alert.dataSource))}>
            {alert.dataSource}
          </Badge>
          <span className="text-xs text-muted-foreground flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            {alert.timestamp}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-3">{alert.description}</p>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-foreground">Current:</span>
            <div className="flex items-center space-x-1 mt-1">
              <TrendIcon className={cn("w-4 h-4", 
                alert.trend === "up" ? "text-chart-2" : 
                alert.trend === "down" ? "text-destructive" : "text-muted-foreground"
              )} />
              <span className="font-mono">{alert.currentValue}</span>
            </div>
          </div>
          <div>
            <span className="font-medium text-foreground">Threshold:</span>
            <p className="font-mono mt-1">{alert.threshold}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AlertCard;