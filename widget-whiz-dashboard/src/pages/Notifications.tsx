import React from "react";
import Navbar from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Bell, Mail, MessageSquare, Smartphone, Clock, Users } from "lucide-react";

const Notifications = () => {
  const notificationMethods = [
    {
      id: "email",
      name: "Email Notifications",
      description: "Receive alerts via email",
      icon: Mail,
      enabled: true,
      channels: ["executives@company.com", "ir@company.com", "cfo@company.com"]
    },
    {
      id: "slack",
      name: "Slack Integration",
      description: "Send alerts to Slack channels",
      icon: MessageSquare,
      enabled: true,
      channels: ["#alerts-critical", "#finance-team", "#executive-updates"]
    },
    {
      id: "sms",
      name: "SMS Alerts",
      description: "Critical alerts via SMS",
      icon: Smartphone,
      enabled: false,
      channels: ["+1 (555) 123-4567", "+1 (555) 987-6543"]
    },
    {
      id: "dashboard",
      name: "Dashboard Notifications",
      description: "In-app notifications",
      icon: Bell,
      enabled: true,
      channels: ["Real-time dashboard updates"]
    }
  ];

  const escalationRules = [
    {
      severity: "Critical",
      immediate: ["CEO", "CFO", "IR Team"],
      after15min: ["Board Members"],
      after1hour: ["External Advisors"],
      color: "text-destructive"
    },
    {
      severity: "Warning",
      immediate: ["CFO", "IR Team"],
      after15min: ["Department Heads"],
      after1hour: ["N/A"],
      color: "text-warning"
    },
    {
      severity: "Info",
      immediate: ["Monitoring Team"],
      after15min: ["N/A"],
      after1hour: ["N/A"],
      color: "text-info"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
            <p className="text-muted-foreground mt-1">
              Configure alert delivery methods and escalation rules
            </p>
          </div>
        </div>

        {/* Notification Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="w-5 h-5 mr-2" />
              Delivery Methods
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {notificationMethods.map((method) => {
              const Icon = method.icon;
              return (
                <div key={method.id} className="flex items-start space-x-4 p-4 border border-border rounded-lg">
                  <div className="p-2 bg-accent rounded-md">
                    <Icon className="w-5 h-5 text-accent-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-foreground">{method.name}</h3>
                      <Switch checked={method.enabled} />
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{method.description}</p>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-foreground">Active Channels:</p>
                      {method.channels.map((channel, index) => (
                        <Badge key={index} variant="outline" className="text-xs mr-2">
                          {channel}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Configure
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Escalation Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Escalation Rules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 font-semibold text-foreground">Severity</th>
                    <th className="text-left p-3 font-semibold text-foreground">Immediate</th>
                    <th className="text-left p-3 font-semibold text-foreground">After 15 min</th>
                    <th className="text-left p-3 font-semibold text-foreground">After 1 hour</th>
                  </tr>
                </thead>
                <tbody>
                  {escalationRules.map((rule) => (
                    <tr key={rule.severity} className="border-b border-border">
                      <td className="p-3">
                        <Badge className={`${rule.color} bg-transparent border`}>
                          {rule.severity}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          {rule.immediate.map((person, index) => (
                            <Badge key={index} variant="secondary" className="text-xs mr-1">
                              <Users className="w-3 h-3 mr-1" />
                              {person}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          {rule.after15min.map((person, index) => (
                            <Badge key={index} variant="outline" className="text-xs mr-1">
                              <Users className="w-3 h-3 mr-1" />
                              {person}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          {rule.after1hour.map((person, index) => (
                            <Badge key={index} variant="outline" className="text-xs mr-1">
                              <Users className="w-3 h-3 mr-1" />
                              {person}
                            </Badge>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Test Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Test Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline">
                <Mail className="w-4 h-4 mr-2" />
                Send Test Email
              </Button>
              <Button variant="outline">
                <MessageSquare className="w-4 h-4 mr-2" />
                Send Test Slack Message
              </Button>
              <Button variant="outline">
                <Smartphone className="w-4 h-4 mr-2" />
                Send Test SMS
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Notifications;