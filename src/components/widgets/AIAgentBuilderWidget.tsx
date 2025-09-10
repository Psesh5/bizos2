import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Bot, 
  Send, 
  Zap, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Settings, 
  Code,
  Lightbulb,
  Cog,
  AlertTriangle
} from "lucide-react";
import { WidgetProps } from "@/types/widget";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { aiAgentService } from "@/services/ai-agent-service";
import { fileGenerationService } from "@/services/file-generation-service";
import { AIAgentSettings } from "@/components/AIAgentSettings";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";

interface AgentRequest {
  id: string;
  userPrompt: string;
  title: string;
  description: string;
  analysis: {
    complexity: "Simple" | "Moderate" | "Complex";
    estimatedTime: string;
    requiredAPIs: string[];
    components: string[];
    risks: string[];
  };
  plan: {
    steps: Array<{
      step: number;
      description: string;
      files: string[];
      estimated_duration: string;
    }>;
    totalSteps: number;
  };
  status: "analyzing" | "awaiting_approval" | "approved" | "building" | "completed" | "rejected" | "error";
  createdAt: string;
  completedAt?: string;
  result?: {
    success: boolean;
    message: string;
    generatedFiles: string[];
    widgetType?: string;
  };
}

const mockAgentRequests: AgentRequest[] = [
  {
    id: "1",
    userPrompt: "Create a widget that tracks my company's social media sentiment across Twitter, LinkedIn and Reddit, with real-time alerts for negative sentiment spikes",
    title: "Social Media Sentiment Tracker",
    description: "Real-time social media sentiment analysis widget with multi-platform monitoring and alert system",
    analysis: {
      complexity: "Complex",
      estimatedTime: "15-20 minutes",
      requiredAPIs: ["Twitter API", "LinkedIn API", "Reddit API", "Sentiment Analysis API"],
      components: ["SentimentWidget.tsx", "SocialMediaService.ts", "SentimentChart.tsx", "AlertSystem.ts"],
      risks: ["API rate limits", "Real-time data processing", "Sentiment accuracy"]
    },
    plan: {
      steps: [
        { step: 1, description: "Set up social media API integrations", files: ["services/social-media-api.ts"], estimated_duration: "5 min" },
        { step: 2, description: "Create sentiment analysis service", files: ["services/sentiment-analysis.ts"], estimated_duration: "4 min" },
        { step: 3, description: "Build sentiment widget component", files: ["widgets/SocialSentimentWidget.tsx"], estimated_duration: "6 min" },
        { step: 4, description: "Implement real-time alert system", files: ["components/SentimentAlerts.tsx"], estimated_duration: "3 min" },
        { step: 5, description: "Add widget to library and test", files: ["WidgetLibrary.tsx", "types/widget.ts"], estimated_duration: "2 min" }
      ],
      totalSteps: 5
    },
    status: "awaiting_approval",
    createdAt: "2 hours ago"
  },
  {
    id: "2",
    userPrompt: "I need a simple widget that shows our current cash burn rate and runway calculation",
    title: "Cash Burn Rate Monitor",
    description: "Financial widget displaying cash burn rate, runway calculation, and trend analysis",
    analysis: {
      complexity: "Simple",
      estimatedTime: "5-8 minutes",
      requiredAPIs: ["FMP Financial API"],
      components: ["CashBurnWidget.tsx", "FinancialCalculations.ts"],
      risks: ["Data accuracy", "Historical data availability"]
    },
    plan: {
      steps: [
        { step: 1, description: "Create cash flow calculation service", files: ["services/cash-calculations.ts"], estimated_duration: "3 min" },
        { step: 2, description: "Build cash burn widget component", files: ["widgets/CashBurnWidget.tsx"], estimated_duration: "4 min" },
        { step: 3, description: "Add to widget library", files: ["WidgetLibrary.tsx"], estimated_duration: "1 min" }
      ],
      totalSteps: 3
    },
    status: "building",
    createdAt: "30 minutes ago"
  },
  {
    id: "3",
    userPrompt: "Create a competitive analysis widget that tracks competitor stock prices, news mentions, and market share data",
    title: "Competitive Intelligence Dashboard",
    description: "Comprehensive competitive analysis with stock tracking, news monitoring, and market intelligence",
    analysis: {
      complexity: "Complex",
      estimatedTime: "20-25 minutes",
      requiredAPIs: ["Polygon API", "News API", "Market Research API"],
      components: ["CompetitorWidget.tsx", "CompetitiveAnalysis.ts", "NewsMonitor.ts", "MarketShareTracker.ts"],
      risks: ["Multiple API dependencies", "Data synchronization", "Real-time updates"]
    },
    plan: {
      steps: [
        { step: 1, description: "Set up competitor tracking service", files: ["services/competitor-api.ts"], estimated_duration: "4 min" },
        { step: 2, description: "Create news monitoring system", files: ["services/competitor-news.ts"], estimated_duration: "4 min" },
        { step: 3, description: "Build competitive analysis widget", files: ["widgets/CompetitiveWidget.tsx"], estimated_duration: "8 min" },
        { step: 4, description: "Implement market share tracking", files: ["components/MarketShareChart.tsx"], estimated_duration: "5 min" },
        { step: 5, description: "Add alerts and notifications", files: ["services/competitive-alerts.ts"], estimated_duration: "3 min" },
        { step: 6, description: "Integration and testing", files: ["WidgetLibrary.tsx"], estimated_duration: "1 min" }
      ],
      totalSteps: 6
    },
    status: "completed",
    createdAt: "1 day ago",
    completedAt: "23 hours ago",
    result: {
      success: true,
      message: "Competitive Intelligence Dashboard successfully created and added to widget library",
      generatedFiles: ["widgets/CompetitiveWidget.tsx", "services/competitor-api.ts", "services/competitor-news.ts"],
      widgetType: "competitive-intelligence"
    }
  }
];

interface AIAgentBuilderWidgetProps extends WidgetProps {
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
}

const RequestCard = ({ 
  request, 
  onApprove, 
  onReject, 
  onViewDetails 
}: { 
  request: AgentRequest; 
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onViewDetails: (request: AgentRequest) => void;
}) => {
  const getStatusIcon = (status: AgentRequest["status"]) => {
    switch (status) {
      case "analyzing":
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      case "awaiting_approval":
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case "approved":
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case "building":
        return <Cog className="w-4 h-4 text-blue-500 animate-spin" />;
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: AgentRequest["status"]) => {
    switch (status) {
      case "analyzing":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "awaiting_approval":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "approved":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "building":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200";
      case "error":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case "Simple":
        return "bg-green-100 text-green-800";
      case "Moderate":
        return "bg-yellow-100 text-yellow-800";
      case "Complex":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {getStatusIcon(request.status)}
              <h3 className="font-semibold text-sm truncate text-foreground">{request.title}</h3>
              <Badge className={cn("text-xs", getStatusColor(request.status))}>
                {request.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
              {request.description}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={cn("text-xs", getComplexityColor(request.analysis.complexity))}>
                {request.analysis.complexity}
              </Badge>
              <span className="text-xs text-muted-foreground">{request.analysis.estimatedTime}</span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">{request.createdAt}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onViewDetails(request)}
            className="flex-1 text-xs"
          >
            View Details
          </Button>
          {request.status === "awaiting_approval" && (
            <>
              <Button
                size="sm"
                onClick={() => onApprove(request.id)}
                className="bg-green-600 hover:bg-green-700 text-white text-xs"
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onReject(request.id)}
                className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
              >
                Reject
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const RequestDetailsModal = ({ 
  request, 
  isOpen, 
  onClose, 
  onApprove, 
  onReject 
}: {
  request: AgentRequest | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) => {
  if (!request) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            {request.title}
          </DialogTitle>
          <DialogDescription>{request.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Prompt */}
          <div>
            <Label className="text-sm font-semibold">Original Request</Label>
            <div className="mt-1 p-3 bg-muted rounded-lg">
              <p className="text-sm">{request.userPrompt}</p>
            </div>
          </div>

          {/* Analysis */}
          <div>
            <Label className="text-sm font-semibold">AI Analysis</Label>
            <div className="mt-2 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Complexity</Label>
                  <Badge className={cn("ml-2", 
                    request.analysis.complexity === "Simple" ? "bg-green-100 text-green-800" :
                    request.analysis.complexity === "Moderate" ? "bg-yellow-100 text-yellow-800" :
                    "bg-red-100 text-red-800"
                  )}>
                    {request.analysis.complexity}
                  </Badge>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Estimated Time</Label>
                  <p className="text-sm font-medium">{request.analysis.estimatedTime}</p>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Required APIs</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {request.analysis.requiredAPIs.map((api, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {api}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Components to Create</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {request.analysis.components.map((component, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      <Code className="w-3 h-3 mr-1" />
                      {component}
                    </Badge>
                  ))}
                </div>
              </div>

              {request.analysis.risks.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Potential Risks</Label>
                  <div className="mt-1">
                    {request.analysis.risks.map((risk, index) => (
                      <Alert key={index} className="mb-2">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-xs">{risk}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Implementation Plan */}
          <div>
            <Label className="text-sm font-semibold">Implementation Plan</Label>
            <div className="mt-2 space-y-2">
              {request.plan.steps.map((step, index) => (
                <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-semibold text-blue-600">{step.step}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{step.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {step.estimated_duration}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">
                        {step.files.length} file{step.files.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {step.files.map((file, fileIndex) => (
                        <Badge key={fileIndex} variant="outline" className="text-xs">
                          {file}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Results (if completed) */}
          {request.result && (
            <div>
              <Label className="text-sm font-semibold">Results</Label>
              <div className="mt-2">
                <Alert className={request.result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                  {request.result.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription className="text-sm">
                    {request.result.message}
                  </AlertDescription>
                </Alert>
                {request.result.generatedFiles && (
                  <div className="mt-2">
                    <Label className="text-xs text-muted-foreground">Generated Files</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {request.result.generatedFiles.map((file, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          <Code className="w-3 h-3 mr-1" />
                          {file}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {request.status === "awaiting_approval" && (
            <div className="flex items-center gap-3 pt-4 border-t">
              <Button
                onClick={() => {
                  onApprove(request.id);
                  onClose();
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve & Start Building
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  onReject(request.id);
                  onClose();
                }}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject Request
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const AIAgentBuilderWidget = ({ 
  widget, 
  onUpdate, 
  onRemove, 
  isExpanded = false, 
  onToggleExpanded 
}: AIAgentBuilderWidgetProps) => {
  const [userPrompt, setUserPrompt] = useState("");
  const [agentRequests, setAgentRequests] = useState<AgentRequest[]>(mockAgentRequests);
  const [selectedRequest, setSelectedRequest] = useState<AgentRequest | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Check AI connection on load
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const connected = await aiAgentService.testConnection();
        setIsConnected(connected);
      } catch {
        setIsConnected(false);
      }
    };
    checkConnection();
  }, []);

  const handleSubmitPrompt = async () => {
    if (!userPrompt.trim()) return;
    
    if (!isConnected) {
      setShowSettingsModal(true);
      return;
    }

    setIsSubmitting(true);
    
    const newRequest: AgentRequest = {
      id: Date.now().toString(),
      userPrompt: userPrompt.trim(),
      title: "AI-Generated Widget Request",
      description: "Analyzing your request to create a custom solution...",
      analysis: {
        complexity: "Moderate",
        estimatedTime: "Analyzing...",
        requiredAPIs: [],
        components: [],
        risks: []
      },
      plan: {
        steps: [],
        totalSteps: 0
      },
      status: "analyzing",
      createdAt: "Now"
    };

    setAgentRequests([newRequest, ...agentRequests]);
    setUserPrompt("");
    
    try {
      // Real AI analysis
      const analysis = await aiAgentService.analyzeRequest({
        userPrompt: userPrompt.trim()
      });
      
      const plan = await aiAgentService.generateImplementationPlan(analysis, {
        userPrompt: userPrompt.trim()
      });
      
      setAgentRequests(current => 
        current.map(req => 
          req.id === newRequest.id 
            ? {
                ...req,
                title: analysis.widgetTitle,
                description: analysis.description,
                analysis,
                plan,
                status: "awaiting_approval"
              }
            : req
        )
      );
    } catch (error) {
      console.error('AI analysis failed:', error);
      setAgentRequests(current => 
        current.map(req => 
          req.id === newRequest.id 
            ? {
                ...req,
                status: "error",
                description: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
              }
            : req
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    const request = agentRequests.find(req => req.id === id);
    if (!request) return;

    setAgentRequests(current =>
      current.map(req =>
        req.id === id ? { ...req, status: "building" as const } : req
      )
    );

    try {
      // Generate the actual widget code
      const generatedWidget = await aiAgentService.generateWidget(
        request.analysis, 
        request.plan, 
        { userPrompt: request.userPrompt }
      );
      
      // Write files to filesystem
      const writeResult = await fileGenerationService.writeWidgetFiles(generatedWidget.files);
      
      // Update widget registry
      await fileGenerationService.updateWidgetRegistry(
        generatedWidget.widgetType, 
        generatedWidget.title
      );
      
      setAgentRequests(current =>
        current.map(req =>
          req.id === id 
            ? { 
                ...req, 
                status: "completed" as const,
                completedAt: "Just now",
                result: {
                  success: writeResult.success,
                  message: writeResult.success 
                    ? `Widget "${generatedWidget.title}" successfully generated! ${writeResult.writtenFiles.length} files created.`
                    : `Generation completed with issues: ${writeResult.message}`,
                  generatedFiles: writeResult.writtenFiles,
                  widgetType: generatedWidget.widgetType
                }
              } 
            : req
        )
      );
    } catch (error) {
      console.error('Widget generation failed:', error);
      setAgentRequests(current =>
        current.map(req =>
          req.id === id 
            ? { 
                ...req, 
                status: "error" as const,
                result: {
                  success: false,
                  message: `Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                  generatedFiles: []
                }
              } 
            : req
        )
      );
    }
  };

  const handleReject = (id: string) => {
    setAgentRequests(current =>
      current.map(req =>
        req.id === id ? { ...req, status: "rejected" as const } : req
      )
    );
  };

  const handleViewDetails = (request: AgentRequest) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };

  // Compact view
  if (!isExpanded) {
    const pendingCount = agentRequests.filter(r => r.status === "awaiting_approval").length;
    const buildingCount = agentRequests.filter(r => r.status === "building").length;
    
    return (
      <div className="h-full">
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-foreground font-mono tracking-wider flex items-center">
              <Bot className="w-4 h-4 mr-2" />
              AI AGENT
            </h3>
            <div className="flex items-center space-x-1">
              <Badge variant="outline" className="bg-blue-100 text-blue-600 border-blue-200 font-mono text-xs px-1 py-0">
                <Zap className="w-2 h-2 mr-1" />
                ACTIVE
              </Badge>
              {onToggleExpanded && (
                <Button variant="ghost" size="sm" onClick={onToggleExpanded} className="h-6 w-6 p-0">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <polyline points="15,3 21,3 21,9" />
                    <polyline points="9,21 3,21 3,15" />
                    <line x1="21" y1="3" x2="14" y2="10" />
                    <line x1="3" y1="21" x2="10" y2="14" />
                  </svg>
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center space-x-2 p-2 bg-background/50 rounded-md border">
              <AlertTriangle className="w-3 h-3 text-yellow-500" />
              <div>
                <div className="text-sm font-bold">{pendingCount}</div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </div>
            </div>
            <div className="flex items-center space-x-2 p-2 bg-background/50 rounded-md border">
              <Cog className="w-3 h-3 text-blue-500" />
              <div>
                <div className="text-sm font-bold">{buildingCount}</div>
                <div className="text-xs text-muted-foreground">Building</div>
              </div>
            </div>
          </div>

          {/* Quick prompt input */}
          <div className="space-y-2">
            <Textarea
              placeholder="Describe what you want the AI to build..."
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              className="text-xs min-h-[60px] resize-none"
            />
            <Button
              onClick={handleSubmitPrompt}
              disabled={!userPrompt.trim() || isSubmitting}
              size="sm"
              className="w-full text-xs"
            >
              {isSubmitting ? (
                <Clock className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Send className="w-3 h-3 mr-1" />
              )}
              {isSubmitting ? "Analyzing..." : "Ask AI to Build"}
            </Button>
          </div>

          {onToggleExpanded && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onToggleExpanded}
              className="w-full text-xs"
            >
              View All Requests ({agentRequests.length})
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Expanded view
  return (
    <div className="h-full overflow-auto">
      <div className="p-4 space-y-6 bg-background min-h-full">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground font-mono tracking-wider flex items-center">
              <Bot className="w-6 h-6 mr-3" />
              AI AGENT BUILDER
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Describe what you need and let AI build it for you
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant="outline" className={cn("font-mono", 
              isConnected 
                ? "bg-green-100 text-green-600 border-green-200" 
                : "bg-red-100 text-red-600 border-red-200"
            )}>
              <Zap className="w-3 h-3 mr-1" />
              {isConnected ? "AI READY" : "AI OFFLINE"}
            </Badge>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowSettingsModal(true)}
              className="h-8"
            >
              <Settings className="w-3 h-3 mr-1" />
              Setup
            </Button>
            {onToggleExpanded && (
              <Button variant="ghost" size="sm" onClick={onToggleExpanded} className="h-8 w-8 p-0">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <polyline points="4,14 10,14 10,20" />
                  <polyline points="20,10 14,10 14,4" />
                  <line x1="14" y1="10" x2="21" y2="3" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              </Button>
            )}
          </div>
        </div>

        {/* New Request Form */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center text-foreground">
              <Lightbulb className="w-5 h-5 mr-2" />
              Make a Request
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="prompt" className="text-foreground">Describe what you want to build</Label>
              <Textarea
                id="prompt"
                placeholder="Example: Create a widget that shows our customer support ticket trends with real-time alerts for SLA breaches..."
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                className="mt-2 min-h-[100px] bg-input border-border text-foreground"
              />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleSubmitPrompt}
                disabled={!userPrompt.trim() || isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? (
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                {isSubmitting ? "AI is analyzing..." : "Submit to AI"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Requests List */}
        <div>
          <h2 className="text-lg font-semibold mb-4 text-foreground">Recent Requests</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agentRequests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                onApprove={handleApprove}
                onReject={handleReject}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        </div>

        {/* Details Modal */}
        <RequestDetailsModal
          request={selectedRequest}
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          onApprove={handleApprove}
          onReject={handleReject}
        />

        {/* Settings Modal */}
        <AIAgentSettings
          isOpen={showSettingsModal}
          onClose={() => {
            setShowSettingsModal(false);
            // Recheck connection after settings changes
            const checkConnection = async () => {
              try {
                const connected = await aiAgentService.testConnection();
                setIsConnected(connected);
              } catch {
                setIsConnected(false);
              }
            };
            checkConnection();
          }}
        />
      </div>
    </div>
  );
};