// AI Agent Service - Real AI Integration for Widget Generation
export interface WidgetGenerationRequest {
  userPrompt: string;
  companyContext?: {
    symbol: string;
    name: string;
    industry: string;
  };
}

export interface AIAnalysis {
  complexity: "Simple" | "Moderate" | "Complex";
  estimatedTime: string;
  requiredAPIs: string[];
  components: string[];
  risks: string[];
  widgetType: string;
  widgetTitle: string;
  description: string;
}

export interface ImplementationPlan {
  steps: Array<{
    step: number;
    description: string;
    files: string[];
    estimated_duration: string;
    code?: string;
  }>;
  totalSteps: number;
}

export interface GeneratedWidget {
  widgetType: string;
  title: string;
  description: string;
  files: Array<{
    path: string;
    content: string;
  }>;
  dependencies?: string[];
}

class AIAgentService {
  private apiKey: string | null = null;
  private apiEndpoint = 'https://api.anthropic.com/v1/messages';

  constructor() {
    // In production, this would come from environment variables
    this.apiKey = localStorage.getItem('claude_api_key') || null;
  }

  setApiKey(key: string) {
    this.apiKey = key;
    localStorage.setItem('claude_api_key', key);
  }

  async analyzeRequest(request: WidgetGenerationRequest): Promise<AIAnalysis> {
    if (!this.apiKey) {
      throw new Error('AI API key not configured. Please set your Claude API key in settings.');
    }

    const analysisPrompt = `
You are an expert React/TypeScript developer specializing in creating financial dashboard widgets. 
Analyze this user request and provide a detailed assessment:

USER REQUEST: "${request.userPrompt}"

CONTEXT: This is for a BusinessOS financial dashboard that already has:
- React 18 + TypeScript
- Tailwind CSS + shadcn/ui components
- Existing widget system with WidgetProps interface
- Financial APIs: FMP (Financial Modeling Prep) and Polygon
- Chart library: Recharts
- State management: React hooks + TanStack Query

Please analyze and respond with a JSON object containing:
{
  "complexity": "Simple" | "Moderate" | "Complex",
  "estimatedTime": "X-Y minutes",
  "requiredAPIs": ["API1", "API2"],
  "components": ["Component1.tsx", "Component2.tsx"],
  "risks": ["Risk description 1", "Risk description 2"],
  "widgetType": "kebab-case-widget-name",
  "widgetTitle": "Human Readable Widget Name",
  "description": "Brief description of what this widget does"
}

Guidelines:
- Simple: Basic display widgets, 5-10 minutes
- Moderate: Interactive widgets with API calls, 10-20 minutes  
- Complex: Multi-API widgets with real-time features, 20+ minutes
- Use existing APIs when possible (FMP for financial data, Polygon for market data)
- Consider data fetching, error handling, responsive design
- Identify potential issues like API rate limits, data availability, etc.
`;

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 1500,
          messages: [{
            role: 'user',
            content: analysisPrompt
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`AI API request failed: ${response.status}`);
      }

      const data = await response.json();
      const content = data.content?.[0]?.text || '';
      
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('AI response did not contain valid JSON analysis');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('AI Analysis failed:', error);
      throw error;
    }
  }

  async generateImplementationPlan(analysis: AIAnalysis, request: WidgetGenerationRequest): Promise<ImplementationPlan> {
    if (!this.apiKey) {
      throw new Error('AI API key not configured');
    }

    const planPrompt = `
Create a detailed implementation plan for this widget:

WIDGET: ${analysis.widgetTitle}
DESCRIPTION: ${analysis.description}
COMPLEXITY: ${analysis.complexity}
USER REQUEST: "${request.userPrompt}"

Required APIs: ${analysis.requiredAPIs.join(', ')}
Components: ${analysis.components.join(', ')}

Create a step-by-step plan as JSON:
{
  "steps": [
    {
      "step": 1,
      "description": "Step description",
      "files": ["path/to/file.ts"],
      "estimated_duration": "X min"
    }
  ],
  "totalSteps": X
}

Guidelines:
- Break into logical steps (services first, then components, then integration)
- Be specific about file paths (use existing patterns: src/services/, src/components/widgets/)
- Include realistic time estimates
- Consider the existing widget system architecture
`;

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 2000,
          messages: [{
            role: 'user',
            content: planPrompt
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`AI API request failed: ${response.status}`);
      }

      const data = await response.json();
      const content = data.content?.[0]?.text || '';
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('AI response did not contain valid implementation plan');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Implementation plan generation failed:', error);
      throw error;
    }
  }

  async generateWidget(analysis: AIAnalysis, plan: ImplementationPlan, request: WidgetGenerationRequest): Promise<GeneratedWidget> {
    if (!this.apiKey) {
      throw new Error('AI API key not configured');
    }

    const files: Array<{ path: string; content: string }> = [];
    
    // Generate each file step by step
    for (const step of plan.steps) {
      for (const filePath of step.files) {
        const code = await this.generateFile(filePath, analysis, request, step);
        files.push({
          path: filePath,
          content: code
        });
      }
    }

    return {
      widgetType: analysis.widgetType,
      title: analysis.widgetTitle,
      description: analysis.description,
      files
    };
  }

  private async generateFile(
    filePath: string, 
    analysis: AIAnalysis, 
    request: WidgetGenerationRequest,
    step: ImplementationPlan['steps'][0]
  ): Promise<string> {
    const isWidget = filePath.includes('widgets/');
    const isService = filePath.includes('services/');
    
    let systemPrompt = '';
    let codePrompt = '';

    if (isWidget) {
      systemPrompt = `
You are generating a React TypeScript widget component for a financial dashboard.

EXISTING SYSTEM:
- Uses WidgetProps interface from @/types/widget
- Styled with Tailwind CSS + shadcn/ui components  
- Responsive design with compact/expanded views
- Error handling and loading states
- Chart components from recharts when needed

WIDGET REQUIREMENTS:
- Widget Type: ${analysis.widgetType}
- Title: ${analysis.widgetTitle}  
- Description: ${analysis.description}
- User Request: "${request.userPrompt}"

Generate ONLY the complete TypeScript React component code. Follow the existing patterns from other widgets in the system.
`;

      codePrompt = `Generate the widget component for: ${filePath}
Step context: ${step.description}

Requirements:
- Export as named export: export const ${analysis.widgetTitle.replace(/\s+/g, '')}Widget
- Implement WidgetProps interface
- Include compact and expanded views if needed
- Handle loading and error states
- Use existing UI components from @/components/ui/*
- Follow BusinessOS styling patterns
- Include proper TypeScript types
`;
    } else if (isService) {
      systemPrompt = `
You are generating a TypeScript service file for data fetching and business logic.

EXISTING APIS:
- FMP API for financial data
- Polygon API for market data
- Use existing API patterns from the codebase

SERVICE REQUIREMENTS:
- Clean, typed interfaces
- Proper error handling
- Return standardized response format
- Use fetch API or existing HTTP clients
`;

      codePrompt = `Generate the service file for: ${filePath}
Step context: ${step.description}
Widget context: ${analysis.description}

Requirements:
- Export typed functions and interfaces
- Handle API responses and errors
- Include JSDoc comments
- Use existing API patterns
`;
    } else {
      codePrompt = `Generate code for: ${filePath}
Context: ${step.description}
Widget: ${analysis.widgetTitle}

Generate appropriate TypeScript code for this file.`;
    }

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 4000,
          messages: [{
            role: 'system',
            content: systemPrompt
          }, {
            role: 'user',
            content: codePrompt
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`Code generation failed for ${filePath}: ${response.status}`);
      }

      const data = await response.json();
      let content = data.content?.[0]?.text || '';
      
      // Extract code blocks if wrapped in markdown
      const codeBlockMatch = content.match(/```(?:typescript|tsx|ts)?\n([\s\S]*?)\n```/);
      if (codeBlockMatch) {
        content = codeBlockMatch[1];
      }

      return content.trim();
    } catch (error) {
      console.error(`Failed to generate ${filePath}:`, error);
      throw error;
    }
  }

  // Test connection with a simple API call
  async testConnection(): Promise<boolean> {
    if (!this.apiKey) return false;

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 100,
          messages: [{
            role: 'user',
            content: 'Respond with "AI connection successful" if you can read this.'
          }]
        })
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}

export const aiAgentService = new AIAgentService();
export default aiAgentService;