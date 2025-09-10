import React, { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import StatsOverview from "@/components/dashboard/StatsOverview";
import AlertCard from "@/components/alerts/AlertCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockActiveAlerts } from "@/data/mockAlerts";
import { Bell, TrendingUp, AlertTriangle, Activity, Satellite } from "lucide-react";

const Index = () => {
  const [alerts, setAlerts] = useState(mockActiveAlerts);

  const handleDismissAlert = (alertId: string) => {
    setAlerts(alerts.filter(alert => alert.id !== alertId));
  };

  const criticalAlerts = alerts.filter(alert => alert.severity === "Critical");
  const warningAlerts = alerts.filter(alert => alert.severity === "Warning");
  const infoAlerts = alerts.filter(alert => alert.severity === "Info");


  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-widget-primary to-widget-secondary"
      style={{
        backgroundImage: `
          radial-gradient(circle at 20% 50%, hsl(var(--chart-1) / 0.1) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, hsl(var(--destructive) / 0.1) 0%, transparent 50%),
          radial-gradient(circle at 40% 80%, hsl(var(--chart-1) / 0.05) 0%, transparent 50%)
        `
      }}
    >
      <Navbar />
      
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground font-mono tracking-wider">INTELLIGENCE HUB</h1>
            <p className="text-muted-foreground mt-1 font-mono text-sm tracking-wide">
              Financial Intelligence Operations • Classification Level: {new Date().getFullYear()}.{String(new Date().getMonth() + 1).padStart(2, '0')}.{String(new Date().getDate()).padStart(2, '0')}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant="outline" className="bg-success/10 text-success border-success/20 font-mono animate-pulse tracking-wide">
              <Activity className="w-3 h-3 mr-1" />
              SYSTEMS ONLINE
            </Badge>
            <Badge variant="outline" className="bg-chart-1/10 text-chart-1 border-chart-1/20 font-mono tracking-wide">
              <Satellite className="w-3 h-3 mr-1" />
              BLACKBOX ACTIVE
            </Badge>
          </div>
        </div>

        {/* Stats Overview */}
        <StatsOverview />

        {/* Active Alerts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Critical Alerts */}
          <Card className="border-destructive/20 bg-gradient-to-br from-background to-destructive/5">
            <CardHeader>
              <CardTitle className="flex items-center text-destructive font-mono">
                <AlertTriangle className="w-5 h-5 mr-2 animate-pulse" />
                CRITICAL THREATS ({criticalAlerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {criticalAlerts.length > 0 ? (
                criticalAlerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onDismiss={handleDismissAlert}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No critical alerts</p>
              )}
            </CardContent>
          </Card>

          {/* Warning Alerts */}
          <Card className="border-warning/20 bg-gradient-to-br from-background to-warning/5">
            <CardHeader>
              <CardTitle className="flex items-center text-warning font-mono">
                <Bell className="w-5 h-5 mr-2" />
                TACTICAL ALERTS ({warningAlerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {warningAlerts.length > 0 ? (
                warningAlerts.slice(0, 3).map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onDismiss={handleDismissAlert}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No warning alerts</p>
              )}
              {warningAlerts.length > 3 && (
                <Button variant="outline" className="w-full" size="sm">
                  View {warningAlerts.length - 3} more warnings
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Info Alerts */}
          <Card className="border-info/20 bg-gradient-to-br from-background to-info/5">
            <CardHeader>
              <CardTitle className="flex items-center text-info font-mono">
                <Satellite className="w-5 h-5 mr-2" />
                INTEL REPORTS ({infoAlerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {infoAlerts.length > 0 ? (
                infoAlerts.slice(0, 2).map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onDismiss={handleDismissAlert}
                  />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No info alerts</p>
              )}
              {infoAlerts.length > 2 && (
                <Button variant="outline" className="w-full" size="sm">
                  View {infoAlerts.length - 2} more alerts
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Command Center */}
        <Card className="bg-gradient-to-r from-widget-primary to-widget-secondary border-chart-1/20">
          <CardHeader>
            <CardTitle className="text-foreground font-mono tracking-wider">OPERATIONS COMMAND</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" className="hover:bg-chart-1/10 hover:border-chart-1/30 font-mono tracking-wide">
                <Bell className="w-4 h-4 mr-2" />
                ALL THREATS
              </Button>
              <Button variant="outline" className="hover:bg-success/10 hover:border-success/30 font-mono tracking-wide">
                <Activity className="w-4 h-4 mr-2" />
                SYSTEM STATUS
              </Button>
              <Button variant="outline" className="hover:bg-info/10 hover:border-info/30 font-mono tracking-wide">
                <Satellite className="w-4 h-4 mr-2" />
                INTEL REPORT
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;