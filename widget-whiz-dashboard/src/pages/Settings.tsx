import React from "react";
import Navbar from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { alertTypes } from "@/data/mockAlerts";
import { Settings as SettingsIcon, Database, Code, Activity, Shield } from "lucide-react";

const Settings = () => {
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground mt-1">
              Configure alert triggers, thresholds, and system preferences
            </p>
          </div>
        </div>

        {/* API Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="w-5 h-5 mr-2" />
              API Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <Label htmlFor="fmp-key">Financial Modeling Prep API Key</Label>
                  <Input
                    id="fmp-key"
                    type="password"
                    placeholder="Enter FMP API key"
                    className="mt-1"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">FMP API Status</span>
                  <Badge className="bg-success/10 text-success border-success/20">
                    <Activity className="w-3 h-3 mr-1" />
                    Connected
                  </Badge>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="polygon-key">Polygon.io API Key</Label>
                  <Input
                    id="polygon-key"
                    type="password"
                    placeholder="Enter Polygon API key"
                    className="mt-1"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Polygon API Status</span>
                  <Badge className="bg-success/10 text-success border-success/20">
                    <Activity className="w-3 h-3 mr-1" />
                    Connected
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alert Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <SettingsIcon className="w-5 h-5 mr-2" />
              Alert Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {alertTypes.map((alert, index) => (
                <div key={index} className="border border-border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground mb-1">
                        {alert.triggerName}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {alert.description}
                      </p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge className={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                        <Badge className={getSourceColor(alert.dataSource)}>
                          {alert.dataSource}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {alert.frequency}
                        </Badge>
                      </div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">
                        METRIC
                      </Label>
                      <p className="font-mono text-xs bg-muted p-2 rounded mt-1">
                        {alert.metric}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">
                        CONDITION
                      </Label>
                      <p className="font-mono text-xs bg-muted p-2 rounded mt-1">
                        {alert.condition}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">
                        ESCALATION
                      </Label>
                      <p className="text-xs bg-muted p-2 rounded mt-1">
                        {alert.escalation}
                      </p>
                    </div>
                  </div>
                  
                  <Separator className="my-3" />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Code className="w-4 h-4 text-muted-foreground" />
                      <code className="text-xs font-mono text-muted-foreground">
                        {alert.endpoint}
                      </code>
                    </div>
                    <Button variant="outline" size="sm">
                      Configure
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              System Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Enable Real-time Monitoring</h3>
                <p className="text-sm text-muted-foreground">
                  Monitor markets and execute alerts in real-time
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Auto-escalation</h3>
                <p className="text-sm text-muted-foreground">
                  Automatically escalate unacknowledged critical alerts
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Historical Data Retention</h3>
                <p className="text-sm text-muted-foreground">
                  Keep alert history for compliance and analysis
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;