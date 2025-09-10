import React, { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import AlertCard from "@/components/alerts/AlertCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mockActiveAlerts } from "@/data/mockAlerts";
import { Search, Filter, AlertTriangle, Clock } from "lucide-react";

const Alerts = () => {
  const [alerts, setAlerts] = useState(mockActiveAlerts);
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");

  const handleDismissAlert = (alertId: string) => {
    setAlerts(alerts.filter(alert => alert.id !== alertId));
  };

  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = alert.triggerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         alert.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = severityFilter === "all" || alert.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  const getSeverityCount = (severity: string) => {
    return alerts.filter(alert => alert.severity === severity).length;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Active Alerts</h1>
            <p className="text-muted-foreground mt-1">
              Manage and respond to financial monitoring alerts
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {getSeverityCount("Critical")} Critical
            </Badge>
            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
              <Clock className="w-3 h-3 mr-1" />
              {getSeverityCount("Warning")} Warnings
            </Badge>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filter Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search alerts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                  <SelectItem value="Warning">Warning</SelectItem>
                  <SelectItem value="Info">Info</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Alert List */}
        <div className="space-y-4">
          {filteredAlerts.length > 0 ? (
            filteredAlerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onDismiss={handleDismissAlert}
              />
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No alerts found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || severityFilter !== "all" 
                    ? "Try adjusting your filters to see more alerts."
                    : "All alerts have been addressed. Great job!"
                  }
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Bulk Actions */}
        {filteredAlerts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Bulk Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button variant="outline">
                  Mark All as Acknowledged
                </Button>
                <Button variant="outline">
                  Export Alerts
                </Button>
                <Button variant="outline">
                  Schedule Report
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Alerts;