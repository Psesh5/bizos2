import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface Activity {
  id: string;
  user: {
    name: string;
    avatar?: string;
    initials: string;
  };
  action: string;
  timestamp: string;
  type: 'info' | 'warning' | 'success' | 'error';
}

interface ActivityFeedProps {
  activities: Activity[];
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  const getBadgeVariant = (type: Activity['type']) => {
    switch (type) {
      case 'success': return 'default';
      case 'warning': return 'secondary';
      case 'error': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-center space-x-4">
            <Avatar className="h-8 w-8">
              <AvatarImage src={activity.user.avatar} />
              <AvatarFallback className="text-xs">
                {activity.user.initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {activity.user.name}
              </p>
              <p className="text-sm text-muted-foreground truncate">
                {activity.action}
              </p>
            </div>
            <div className="flex flex-col items-end space-y-1">
              <Badge variant={getBadgeVariant(activity.type)} className="text-xs">
                {activity.type}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {activity.timestamp}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}