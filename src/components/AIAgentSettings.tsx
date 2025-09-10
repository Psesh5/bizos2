import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Settings,
  Key,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  FileText,
  Trash2
} from "lucide-react";
import { aiAgentService } from "@/services/ai-agent-service";
import { fileGenerationService } from "@/services/file-generation-service";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface AIAgentSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AIAgentSettings = ({ isOpen, onClose }: AIAgentSettingsProps) => {
  const [apiKey, setApiKey] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [generatedFiles, setGeneratedFiles] = useState<Array<{ path: string; content: string; timestamp: string }>>([]);
  const [updatePlans, setUpdatePlans] = useState<Array<{ widgetType: string; plan: any }>>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  useEffect(() => {
    // Load existing API key
    const existingKey = localStorage.getItem('claude_api_key');
    if (existingKey) {
      setApiKey(existingKey);
      testConnection();
    }
    
    // Load generated files and update plans
    loadGeneratedData();
  }, [isOpen]);

  const loadGeneratedData = () => {
    const files = fileGenerationService.getGeneratedFiles();
    const plans = fileGenerationService.getUpdatePlans();
    setGeneratedFiles(files);
    setUpdatePlans(plans);
  };

  const testConnection = async () => {
    setIsTestingConnection(true);
    try {
      const connected = await aiAgentService.testConnection();
      setIsConnected(connected);
    } catch (error) {
      setIsConnected(false);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSaveApiKey = async () => {
    aiAgentService.setApiKey(apiKey);
    await testConnection();
  };

  const clearGeneratedFiles = () => {
    fileGenerationService.clearGeneratedFiles();
    loadGeneratedData();
  };

  const getFileContent = (path: string): string => {
    const file = generatedFiles.find(f => f.path === path);
    return file?.content || '';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            AI Agent Settings & Debug Console
          </DialogTitle>
          <DialogDescription>
            Configure AI integration and review generated code
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="files">Generated Files ({generatedFiles.length})</TabsTrigger>
            <TabsTrigger value="plans">Update Plans ({updatePlans.length})</TabsTrigger>
            <TabsTrigger value="debug">Debug Info</TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Claude API Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="apikey">Claude API Key</Label>
                  <Input
                    id="apikey"
                    type="password"
                    placeholder="sk-ant-..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Get your API key from <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Anthropic Console</a>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Button onClick={handleSaveApiKey} disabled={!apiKey.trim()}>
                    Save & Test Connection
                  </Button>
                  
                  <div className="flex items-center gap-2">
                    {isTestingConnection ? (
                      <Badge variant="outline" className="animate-pulse">
                        <Settings className="w-3 h-3 mr-1 animate-spin" />
                        Testing...
                      </Badge>
                    ) : isConnected ? (
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Connected
                      </Badge>
                    ) : apiKey ? (
                      <Badge className="bg-red-100 text-red-800 border-red-200">
                        <XCircle className="w-3 h-3 mr-1" />
                        Disconnected
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Not Configured
                      </Badge>
                    )}
                  </div>
                </div>

                {!isConnected && apiKey && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Unable to connect to Claude API. Please check your API key and internet connection.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>How it works:</strong> When you submit a request, the AI will analyze it, create an implementation plan, and generate actual TypeScript/React code. 
                Generated files are stored locally and can be reviewed before integration.
              </AlertDescription>
            </Alert>
          </TabsContent>

          <TabsContent value="files" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Generated Widget Files</h3>
              {generatedFiles.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearGeneratedFiles}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>

            {generatedFiles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No files generated yet</p>
                <p className="text-sm">Submit a request in the AI Agent Builder to see generated code here</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Generated Files</Label>
                  {generatedFiles.map((file, index) => (
                    <Card 
                      key={index} 
                      className={`cursor-pointer transition-colors ${selectedFile === file.path ? 'ring-2 ring-blue-500' : ''}`}
                      onClick={() => setSelectedFile(file.path)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <code className="text-sm font-mono">{file.path.replace('/Users/ps/bizos3/src/', '')}</code>
                          <Badge variant="outline" className="text-xs">
                            {new Date(file.timestamp).toLocaleTimeString()}
                          </Badge>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label>File Contents</Label>
                  {selectedFile ? (
                    <Card>
                      <CardHeader>
                        <code className="text-sm">{selectedFile.replace('/Users/ps/bizos3/src/', '')}</code>
                      </CardHeader>
                      <CardContent>
                        <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-96">
                          {getFileContent(selectedFile)}
                        </pre>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                      <p>Select a file to view its contents</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="plans" className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-4">Widget Integration Plans</h3>
              <p className="text-sm text-muted-foreground mb-4">
                These show the changes needed to integrate generated widgets into your dashboard system.
              </p>
            </div>

            {updatePlans.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Settings className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No integration plans yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {updatePlans.map((item, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="text-base">Widget: {item.widgetType}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-semibold">File: {item.plan.file}</Label>
                          <div className="mt-1 space-y-1">
                            {item.plan.changes.map((change: any, changeIndex: number) => (
                              <div key={changeIndex} className="text-xs bg-muted p-2 rounded font-mono">
                                <div className="text-blue-600 font-semibold">{change.type}:</div>
                                <div>{change.line || JSON.stringify(change.data, null, 2)}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="debug" className="space-y-4">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>System Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>AI Service Connected:</span>
                    <Badge className={isConnected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {isConnected ? "Yes" : "No"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Generated Files Count:</span>
                    <Badge variant="outline">{generatedFiles.length}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Pending Integration Plans:</span>
                    <Badge variant="outline">{updatePlans.length}</Badge>
                  </div>
                </CardContent>
              </Card>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Note:</strong> This is running in browser environment. In production, file writing would happen server-side. 
                  Generated files are currently stored in localStorage for demonstration purposes.
                </AlertDescription>
              </Alert>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};