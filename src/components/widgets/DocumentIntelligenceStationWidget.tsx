import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, Activity, Users, Target, TrendingUp, Maximize2 } from 'lucide-react';
import { benzingaApi } from '@/services/benzinga-api';
import { fmpApi } from '@/services/fmp-api';
import { WidgetProps } from '@/types/widget';

interface UploadedDocument {
  id: string;
  name: string;
  size: number;
  uploadDate: Date;
  analyst?: string;
  firm?: string;
  rating?: string;
  priceTarget?: number;
  keyPoints: string[];
  extractedData?: ExtractedFinancialData;
}

interface ExtractedFinancialData {
  analyst?: string;
  firm?: string;
  reportDate?: string;
  priceTarget?: {
    current: number;
    previous?: number;
    change?: string;
  };
  revenue?: {
    current: string;
    previous?: string;
    year: string;
  }[];
  eps?: {
    current: number;
    previous?: number;
    year: string;
  }[];
  rating?: {
    current: string;
    previous?: string;
  };
  margins?: {
    type: string;
    current: string;
    previous?: string;
  }[];
  catalysts?: string[];
  valuationMethod?: string;
  keyMetrics?: {
    name: string;
    value: string;
    previous?: string;
  }[];
}

interface AnalystData {
  name: string;
  firm: string;
  rating: string;
  priceTarget: number;
  accuracy: number;
}

interface ConsensusData {
  averageTarget: number;
  highTarget: number;
  lowTarget: number;
  totalAnalysts: number;
  buyRatings: number;
  holdRatings: number;
  sellRatings: number;
}

export const DocumentIntelligenceStationWidget: React.FC<WidgetProps> = ({
  widget,
  onUpdate,
  onRemove,
  isExpanded = false,
  onToggleExpanded
}) => {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [analystData, setAnalystData] = useState<AnalystData[]>([]);
  const [consensusData, setConsensusData] = useState<ConsensusData | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Get symbol from widget config
  const symbol = widget.config?.symbol || 'AAPL';

  // Load analyst data from Benzinga API
  useEffect(() => {
    const loadAnalystData = async () => {
      if (!symbol) return;
      
      try {
        setIsLoading(true);
        const ratings = await benzingaApi.getAnalystRatings(symbol, 20);
        
        const analystMap = new Map<string, AnalystData>();
        ratings.forEach(rating => {
          if (rating.analyst_name && !analystMap.has(rating.analyst_name)) {
            analystMap.set(rating.analyst_name, {
              name: rating.analyst_name,
              firm: rating.firm,
              rating: rating.rating_current,
              priceTarget: rating.pt_current,
              accuracy: 0
            });
          }
        });
        
        setAnalystData(Array.from(analystMap.values()));
      } catch (error) {
        console.error('Error loading analyst data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAnalystData();
  }, [symbol]);

  // Load consensus data from FMP API
  useEffect(() => {
    const loadConsensusData = async () => {
      if (!symbol) return;
      
      try {
        const estimates = await fmpApi.getAnalystEstimates(symbol);
        const priceTargets = await fmpApi.getPriceTarget(symbol);
        
        if (priceTargets.length > 0) {
          const targets = priceTargets.map(t => t.priceTarget).filter(Boolean);
          setConsensusData({
            averageTarget: targets.reduce((a, b) => a + b, 0) / targets.length,
            highTarget: Math.max(...targets),
            lowTarget: Math.min(...targets),
            totalAnalysts: targets.length,
            buyRatings: priceTargets.filter(t => t.grade?.toLowerCase().includes('buy')).length,
            holdRatings: priceTargets.filter(t => t.grade?.toLowerCase().includes('hold')).length,
            sellRatings: priceTargets.filter(t => t.grade?.toLowerCase().includes('sell')).length
          });
        }
      } catch (error) {
        console.error('Error loading consensus data:', error);
      }
    };

    loadConsensusData();
  }, [symbol]);

  const extractFinancialDataFromText = (text: string, fileName: string): ExtractedFinancialData => {
    const extracted: ExtractedFinancialData = {};
    
    // Extract price target (enhanced patterns for CSV and PDF)
    const priceTargetPatterns = [
      /price\s+target[:\s]*\$([\d.,]+)/i,
      /target\s+price[:\s]*\$([\d.,]+)/i,
      /PT[:\s]*\$([\d.,]+)/i,
      /price target[:\s]*([\d.,]+)/i,
      /target[:\s]*\$([\d.,]+)/i,
      // CSV specific patterns
      /Price Target[:\s]*([\d.,]+)/i,
      /Target Price[:\s]*([\d.,]+)/i
    ];
    
    for (const pattern of priceTargetPatterns) {
      const match = text.match(pattern);
      if (match) {
        const price = parseFloat(match[1].replace(/,/g, ''));
        if (price > 0) {
          extracted.priceTarget = { current: price };
          break;
        }
      }
    }
    
    // Extract revenue estimates (enhanced for CSV)
    const revenuePatterns = [
      /revenue[\s\w]*([\d]{4})[eE]?[:\s]*\$?([\d.,]+[MBK]?)/gi,
      /([\d]{4})\s+Revenue[:\s]*\$?([\d.,]+[MBK]?)/gi,
      /FY([\d]{4})[\s]*Revenue[:\s]*\$?([\d.,]+[MBK]?)/gi,
      // CSV column patterns
      /Revenue\s+([\d]{4})[:\s]*([\d.,]+)/gi,
      /([\d]{4})E\s+Revenue[:\s]*([\d.,]+)/gi
    ];
    
    const revenues: any[] = [];
    revenuePatterns.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const year = match[1] || match[2];
        const amount = match[2] || match[3];
        if (year && amount) {
          revenues.push({
            year: year,
            current: amount
          });
        }
      }
    });
    
    if (revenues.length > 0) {
      // Remove duplicates and sort by year
      const uniqueRevenues = revenues.filter((rev, index, self) => 
        index === self.findIndex(r => r.year === rev.year)
      ).sort((a, b) => parseInt(a.year) - parseInt(b.year));
      extracted.revenue = uniqueRevenues;
    }
    
    // Extract rating (expanded patterns)
    const ratingPatterns = [
      /rating[:\s]*(overweight|buy|hold|sell|underperform|outperform|strong buy|strong sell|neutral)/i,
      /recommendation[:\s]*(overweight|buy|hold|sell|underperform|outperform|strong buy|strong sell|neutral)/i,
      /Rating[:\s]*(Overweight|Buy|Hold|Sell|Underperform|Outperform|Strong Buy|Strong Sell|Neutral)/i
    ];
    
    for (const pattern of ratingPatterns) {
      const match = text.match(pattern);
      if (match) {
        extracted.rating = { current: match[1] };
        break;
      }
    }
    
    // Extract valuation method
    const valuationMatch = text.match(/(DCF|discounted cash flow|P\/E|EV\/EBITDA|relative valuation|[\d]+-year DCF)/i);
    if (valuationMatch) {
      extracted.valuationMethod = valuationMatch[1];
    }
    
    // Extract EPS estimates
    const epsMatches = text.matchAll(/(EPS|earnings per share)[\s\w]*([\d]{4})[eE]?[:\s]*\$?([\d.-]+)/gi);
    const epsData: any[] = [];
    for (const match of epsMatches) {
      epsData.push({
        year: match[2],
        current: parseFloat(match[3])
      });
    }
    if (epsData.length > 0) {
      extracted.eps = epsData;
    }
    
    // Extract key catalysts (enhanced patterns)
    const catalysts: string[] = [];
    const catalystPatterns = [
      /catalyst[s]?[:\s]*([^\n.;]+)/gi,
      /key driver[s]?[:\s]*([^\n.;]+)/gi,
      /upside[s]?[:\s]*([^\n.;]+)/gi,
      /opportunity[:\s]*([^\n.;]+)/gi,
      // CSV specific
      /Catalyst[:\s]*([^\n,]+)/gi,
      /Driver[:\s]*([^\n,]+)/gi
    ];
    
    catalystPatterns.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[1].trim().length > 10) {
          catalysts.push(match[1].trim());
        }
      }
    });
    
    if (catalysts.length > 0) {
      // Remove duplicates and limit
      const uniqueCatalysts = [...new Set(catalysts)].slice(0, 5);
      extracted.catalysts = uniqueCatalysts;
    }
    
    // Extract margins
    const marginMatches = text.matchAll(/(gross|operating|EBITDA|net)\s+margin[s]?[:\s]*([\d.]+%)/gi);
    const margins: any[] = [];
    for (const match of marginMatches) {
      margins.push({
        type: match[1],
        current: match[2]
      });
    }
    if (margins.length > 0) {
      extracted.margins = margins;
    }
    
    // Extract key metrics for CSV files
    if (fileName.toLowerCase().includes('.csv')) {
      const keyMetrics: any[] = [];
      // Look for common financial metrics in CSV format
      const metricPatterns = [
        /(Market Cap|EBITDA|P\/E|EV\/Sales|ROE|ROA|Debt\/Equity)[:\s]*([\d.,]+[%MBK]?)/gi,
        /(Beta|Volume|Shares Outstanding)[:\s]*([\d.,]+[MBK]?)/gi
      ];
      
      metricPatterns.forEach(pattern => {
        const matches = text.matchAll(pattern);
        for (const match of matches) {
          keyMetrics.push({
            name: match[1],
            value: match[2]
          });
        }
      });
      
      if (keyMetrics.length > 0) {
        extracted.keyMetrics = keyMetrics;
      }
    }
    
    return extracted;
  };

  const analyzeDocumentWithAI = async (file: File): Promise<ExtractedFinancialData> => {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    console.log('🔑 API Key check:', apiKey ? 'Found' : 'Missing');
    if (!apiKey) {
      console.warn('OpenAI API key not found - add VITE_OPENAI_API_KEY to your .env.local file');
      return {};
    }
    
    console.log('🤖 Starting AI analysis for:', file.name);

    try {
      let documentText = '';
      
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        // Use pdfjs-dist library to extract text from PDF (browser-compatible)
        const pdfjsLib = await import('pdfjs-dist');
        
        // Set worker source
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
        
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        let fullText = '';
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          fullText += pageText + '\n';
        }
        
        documentText = fullText;
        console.log('📄 Extracted PDF text length:', documentText.length);
        console.log('📄 First 500 chars:', documentText.substring(0, 500));
      } else {
        // For text files, read directly
        documentText = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string || '');
          reader.readAsText(file);
        });
      }
      
      if (!documentText) {
        console.warn('❌ No text content extracted from document');
        return {};
      }
      
      console.log('📄 Document text length:', documentText.length);
      
      // Now analyze the extracted text
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are a financial analyst expert at extracting key financial data from analyst reports and documents. Extract data accurately and return only valid JSON.'
            },
            {
              role: 'user',
              content: `Please analyze the following financial document text from ${file.name} and extract the financial data in this exact JSON format:

DOCUMENT TEXT:
${documentText}

Please extract the following financial data in this exact JSON format:

{
  "analyst": "Andres Sheppard",
  "firm": "Cantor Fitzgerald",
  "reportDate": "2025-04-11",
  "priceTarget": {"current": 29.00, "previous": 24.00},
  "revenue": [{"year": "2025", "current": "646.0M"}, {"year": "2026", "current": "996.7M"}],
  "eps": [{"year": "2025", "current": 0.45}, {"year": "2026", "current": 0.78}],
  "rating": {"current": "Overweight", "previous": "Overweight"},
  "valuationMethod": "5-year DCF",
  "catalysts": ["SDA Tranche 3 award", "Neutron rocket development", "Space manufacturing"],
  "margins": [{"type": "gross", "current": "25%"}, {"type": "operating", "current": "15%"}],
  "keyMetrics": [{"name": "Market Cap", "value": "12.5B"}, {"name": "Enterprise Value", "value": "11.8B"}]
}

Focus on extracting these key items:
- Price Target: Look for "Price Target", "PT", "Target Price", or similar
- Revenue estimates: Look for revenue projections by year (2025E, 2026E, FY25, FY26)
- EPS estimates: Earnings per share by year
- Rating: Buy/Sell/Hold/Overweight/Underweight/Neutral recommendations
- Valuation Method: DCF, P/E multiple, EV/EBITDA, Sum-of-parts, etc.
- Catalysts: Key drivers, catalysts, investment thesis points
- Margins: Gross margin, operating margin, EBITDA margin expectations
- Key Metrics: Important financial metrics mentioned

Return ONLY the JSON object, no other text or formatting.`
            }
          ],
          max_tokens: 1500
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', response.status, errorText);
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const result = await response.json();
      console.log('📡 OpenAI API response:', result);
      const content = result.choices?.[0]?.message?.content;
      
      if (content) {
        console.log('✅ Content received:', content.substring(0, 200) + '...');
        try {
          // Clean the response in case it has markdown formatting
          const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
          const parsed = JSON.parse(cleanContent);
          console.log('🎯 Parsed data:', parsed);
          return parsed;
        } catch (e) {
          console.warn('❌ Failed to parse OpenAI response as JSON:', content);
          return {};
        }
      } else {
        console.warn('❌ No content in OpenAI response');
        return {};
      }
    } catch (error) {
      console.error('Error analyzing document with AI:', error);
    }
    
    return {};
  };

  const processFileContent = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        // For PDF files, we'll use AI analysis instead of text extraction
        resolve(`PDF file: ${file.name} - Will be analyzed with AI`);
      } else if (file.type.includes('text') || file.name.toLowerCase().endsWith('.csv') || file.name.toLowerCase().endsWith('.txt')) {
        // Handle text and CSV files
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string || '';
          
          // If it's a CSV, convert to readable format for extraction
          if (file.name.toLowerCase().endsWith('.csv')) {
            const lines = content.split('\n');
            const headers = lines[0]?.split(',') || [];
            const rows = lines.slice(1);
            
            // Convert CSV to text format for easier parsing
            let csvText = `CSV Data from ${file.name}:\n`;
            rows.forEach((row, index) => {
              const values = row.split(',');
              headers.forEach((header, i) => {
                if (values[i]) {
                  csvText += `${header.trim()}: ${values[i].trim()}\n`;
                }
              });
              csvText += '\n';
            });
            
            resolve(csvText);
          } else {
            resolve(content);
          }
        };
        reader.readAsText(file);
      } else if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
        // Excel files - would need a library like xlsx to parse
        resolve(`Excel file: ${file.name} - Content extraction requires Excel parser`);
      } else {
        resolve(`Unsupported file type: ${file.type} (${file.name})`);
      }
    });
  };

  const handleFileUpload = async (files: FileList) => {
    setIsUploading(true);
    
    const newDocuments: UploadedDocument[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let extractedData: ExtractedFinancialData = {};
      
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        // Use AI analysis for PDF files
        extractedData = await analyzeDocumentWithAI(file);
      } else {
        // Use text extraction for other files
        const content = await processFileContent(file);
        extractedData = extractFinancialDataFromText(content, file.name);
      }
      
      const doc: UploadedDocument = {
        id: `doc-${Date.now()}-${i}`,
        name: file.name,
        size: file.size,
        uploadDate: new Date(),
        extractedData,
        keyPoints: [
          `Price Target: $${extractedData.priceTarget?.current || 'N/A'}`,
          `Rating: ${extractedData.rating?.current || 'N/A'}`,
          `Valuation: ${extractedData.valuationMethod || 'N/A'}`,
          `Revenue Estimates: ${extractedData.revenue?.length || 0} found`,
          `Catalysts: ${extractedData.catalysts?.length || 0} identified`
        ]
      };
      
      // Try to match with existing analyst data
      const matchingAnalyst = analystData.find(analyst => 
        file.name.toLowerCase().includes(analyst.name.toLowerCase().split(' ')[0]) ||
        file.name.toLowerCase().includes(analyst.firm.toLowerCase())
      );
      
      if (matchingAnalyst) {
        doc.analyst = matchingAnalyst.name;
        doc.firm = matchingAnalyst.firm;
        doc.rating = extractedData.rating?.current || matchingAnalyst.rating;
        doc.priceTarget = extractedData.priceTarget?.current || matchingAnalyst.priceTarget;
      }
      
      newDocuments.push(doc);
    }
    
    setDocuments(prev => [...prev, ...newDocuments]);
    setIsUploading(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const CompactView = () => (
    <div className="bg-slate-900 border border-green-500/30 text-green-400 font-mono rounded-lg overflow-hidden">
      <div className="p-3 border-b border-green-500/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          <span className="text-sm font-bold">DOC INTEL STATION</span>
          <Badge variant="outline" className="border-green-500/50 text-green-400 text-xs">
            {documents.length} FILES
          </Badge>
        </div>
        {onToggleExpanded && (
          <Button
            onClick={onToggleExpanded}
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0 text-green-400 hover:bg-green-500/10"
          >
            <Maximize2 className="h-3 w-3" />
          </Button>
        )}
      </div>
      <div className="p-3 space-y-3">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-800 p-2 rounded border border-green-500/20">
            <div className="text-green-300">CONSENSUS TARGET</div>
            <div className="text-lg font-bold">
              ${consensusData?.averageTarget?.toFixed(2) || '--'}
            </div>
          </div>
          <div className="bg-slate-800 p-2 rounded border border-green-500/20">
            <div className="text-green-300">ANALYSTS</div>
            <div className="text-lg font-bold">
              {consensusData?.totalAnalysts || analystData.length}
            </div>
          </div>
        </div>
        
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>UPLOAD STATUS</span>
            <span>{documents.length > 0 ? 'ACTIVE' : 'STANDBY'}</span>
          </div>
          <Progress 
            value={documents.length > 0 ? 75 : 0} 
            className="h-1 bg-slate-800" 
          />
        </div>

        {documents.length === 0 && (
          <div className="text-center py-2 text-xs text-green-300">
            DROP FILES TO ANALYZE
          </div>
        )}
      </div>
    </div>
  );

  const ExpandedView = () => (
    <Card className="bg-slate-900 border-green-500/30 text-green-400 font-mono w-full">
      <CardHeader className="border-b border-green-500/20">
        <CardTitle className="text-green-400 flex items-center gap-3">
          <Activity className="h-5 w-5" />
          DOCUMENT INTELLIGENCE STATION
          <Badge variant="outline" className="border-green-500/50 text-green-400 ml-auto">
            CLASSIFICATION: RESTRICTED
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6">
        {/* File Upload Area */}
        <div 
          className="border-2 border-dashed border-green-500/30 rounded-lg p-8 text-center mb-6 
                     hover:border-green-500/50 transition-colors cursor-pointer bg-slate-800/30"
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          <input
            id="file-upload"
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx"
            onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
            className="hidden"
          />
          
          <Upload className="h-12 w-12 mx-auto mb-4 text-green-400" />
          <h3 className="text-lg font-semibold mb-2">UPLOAD ANALYST DOCUMENTS</h3>
          <p className="text-sm text-green-300">
            Drop files here or click to select • PDF, DOC, DOCX, TXT, CSV, XLS, XLSX supported
          </p>
          {isUploading && (
            <div className="mt-4">
              <Progress value={75} className="h-2 bg-slate-800" />
              <p className="text-xs mt-2">PROCESSING FILES...</p>
            </div>
          )}
        </div>

        {/* Consensus Data Summary */}
        {consensusData && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card className="bg-slate-800 border-green-500/20">
              <CardContent className="p-4 text-center">
                <Target className="h-6 w-6 mx-auto mb-2 text-green-400" />
                <div className="text-xl font-bold">${consensusData.averageTarget.toFixed(2)}</div>
                <div className="text-xs text-green-300">AVG TARGET</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800 border-green-500/20">
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-6 w-6 mx-auto mb-2 text-green-400" />
                <div className="text-xl font-bold">${consensusData.highTarget.toFixed(2)}</div>
                <div className="text-xs text-green-300">HIGH TARGET</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800 border-green-500/20">
              <CardContent className="p-4 text-center">
                <Users className="h-6 w-6 mx-auto mb-2 text-green-400" />
                <div className="text-xl font-bold">{consensusData.totalAnalysts}</div>
                <div className="text-xs text-green-300">ANALYSTS</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800 border-green-500/20">
              <CardContent className="p-4 text-center">
                <Activity className="h-6 w-6 mx-auto mb-2 text-green-400" />
                <div className="text-xl font-bold">{consensusData.buyRatings}</div>
                <div className="text-xs text-green-300">BUY RATINGS</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Documents Table */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            UPLOADED DOCUMENTS ({documents.length})
          </h3>
          
          {documents.length === 0 ? (
            <div className="text-center py-8 text-green-300">
              NO DOCUMENTS UPLOADED
              <br />
              <span className="text-xs">Upload analyst reports to begin analysis</span>
            </div>
          ) : (
            <div className="bg-slate-800 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left">DOCUMENT</th>
                    <th className="px-4 py-3 text-left">ANALYST</th>
                    <th className="px-4 py-3 text-left">FIRM</th>
                    <th className="px-4 py-3 text-left">RATING</th>
                    <th className="px-4 py-3 text-left">TARGET</th>
                    <th className="px-4 py-3 text-left">SIZE</th>
                    <th className="px-4 py-3 text-left">UPLOADED</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc, index) => (
                    <tr key={doc.id} className={index % 2 === 0 ? 'bg-slate-800' : 'bg-slate-750'}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span className="truncate max-w-[150px]">{doc.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">{doc.analyst || 'Unknown'}</td>
                      <td className="px-4 py-3">{doc.firm || '--'}</td>
                      <td className="px-4 py-3">
                        {doc.rating && (
                          <Badge 
                            variant="outline" 
                            className={`border-${doc.rating?.toLowerCase().includes('buy') ? 'green' : 
                                      doc.rating?.toLowerCase().includes('sell') ? 'red' : 'yellow'}-500/50`}
                          >
                            {doc.rating}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {doc.priceTarget ? `$${doc.priceTarget.toFixed(2)}` : '--'}
                      </td>
                      <td className="px-4 py-3 text-xs">{formatFileSize(doc.size)}</td>
                      <td className="px-4 py-3 text-xs">
                        {doc.uploadDate.toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Extracted Financial Data Analysis */}
        {documents.length > 0 && (
          <div className="mt-6 space-y-6">
            <h3 className="text-lg font-semibold mb-3">EXTRACTED FINANCIAL INTELLIGENCE</h3>
            
            {/* Analyst Grouping */}
            {(() => {
              const analystGroups = documents.reduce((groups: Record<string, UploadedDocument[]>, doc) => {
                const analystKey = doc.extractedData?.analyst || doc.analyst || 'Unknown Analyst';
                const firmKey = doc.extractedData?.firm || doc.firm || '';
                const key = firmKey ? `${analystKey} (${firmKey})` : analystKey;
                
                if (!groups[key]) groups[key] = [];
                groups[key].push(doc);
                return groups;
              }, {});
              
              return Object.keys(analystGroups).length > 1 ? (
                <Card className="bg-slate-800 border-green-500/20 mb-4">
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      ANALYST COVERAGE ({Object.keys(analystGroups).length} analysts)
                    </h4>
                    <div className="grid gap-4">
                      {Object.entries(analystGroups).map(([analystKey, docs]) => {
                        const sortedDocs = docs.sort((a, b) => 
                          new Date(a.extractedData?.reportDate || a.uploadDate).getTime() - 
                          new Date(b.extractedData?.reportDate || b.uploadDate).getTime()
                        );
                        const latestDoc = sortedDocs[sortedDocs.length - 1];
                        const firstDoc = sortedDocs[0];
                        
                        return (
                          <div key={analystKey} className="bg-slate-700 p-3 rounded">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <span className="font-semibold text-green-400">{analystKey}</span>
                                <div className="text-xs text-gray-400">{docs.length} report{docs.length > 1 ? 's' : ''}</div>
                              </div>
                              <div className="text-right text-sm">
                                <div className="font-bold">
                                  ${latestDoc.extractedData?.priceTarget?.current || latestDoc.priceTarget || 'N/A'}
                                </div>
                                {docs.length > 1 && firstDoc.extractedData?.priceTarget?.current !== latestDoc.extractedData?.priceTarget?.current && (
                                  <div className="text-xs text-gray-400">
                                    was ${firstDoc.extractedData?.priceTarget?.current || firstDoc.priceTarget || 'N/A'}
                                  </div>
                                )}
                              </div>
                            </div>
                            {docs.length > 1 && (
                              <div className="text-xs text-green-300">
                                Timeline: {new Date(firstDoc.extractedData?.reportDate || firstDoc.uploadDate).toLocaleDateString()} → {new Date(latestDoc.extractedData?.reportDate || latestDoc.uploadDate).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ) : null;
            })()}
            
            {/* Price Target Evolution */}
            {documents.some(doc => doc.extractedData?.priceTarget) && (
              <Card className="bg-slate-800 border-green-500/20">
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    PRICE TARGET EVOLUTION
                  </h4>
                  <div className="space-y-2">
                    {documents
                      .filter(doc => doc.extractedData?.priceTarget)
                      .sort((a, b) => a.uploadDate.getTime() - b.uploadDate.getTime())
                      .map(doc => (
                        <div key={doc.id} className="flex justify-between items-center p-2 bg-slate-700 rounded text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-green-300">{doc.uploadDate.toLocaleDateString()}</span>
                            <span className="text-gray-400">•</span>
                            <span>{doc.name.split('.')[0]}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-xl font-bold text-green-400">
                              ${doc.extractedData?.priceTarget?.current}
                            </span>
                            {doc.extractedData?.priceTarget?.previous && (
                              <div className="text-xs text-gray-400">
                                (was ${doc.extractedData.priceTarget.previous})
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Revenue Estimates Comparison */}
            {documents.some(doc => doc.extractedData?.revenue?.length) && (
              <Card className="bg-slate-800 border-green-500/20">
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    REVENUE ESTIMATE TRACKING
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-green-500/20">
                          <th className="text-left py-2">DOCUMENT</th>
                          <th className="text-left py-2">DATE</th>
                          <th className="text-left py-2">2025E</th>
                          <th className="text-left py-2">2026E</th>
                          <th className="text-left py-2">2027E</th>
                        </tr>
                      </thead>
                      <tbody>
                        {documents
                          .filter(doc => doc.extractedData?.revenue?.length)
                          .map(doc => (
                            <tr key={doc.id} className="border-b border-slate-700">
                              <td className="py-2">{doc.name.split('.')[0]}</td>
                              <td className="py-2 text-green-300">{doc.uploadDate.toLocaleDateString()}</td>
                              <td className="py-2">
                                {doc.extractedData?.revenue?.find(r => r.year === '2025')?.current || '--'}
                              </td>
                              <td className="py-2">
                                {doc.extractedData?.revenue?.find(r => r.year === '2026')?.current || '--'}
                              </td>
                              <td className="py-2">
                                {doc.extractedData?.revenue?.find(r => r.year === '2027')?.current || '--'}
                              </td>
                            </tr>
                          ))
                        }
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Key Intelligence Summary */}
            <div className="grid gap-4">
              {documents.map(doc => (
                <Card key={doc.id} className="bg-slate-800 border-green-500/20">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="font-semibold">{doc.name}</span>
                        {doc.analyst && (
                          <Badge variant="outline" className="border-green-500/50 text-green-400">
                            {doc.analyst}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-green-300">
                        {doc.uploadDate.toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-3 text-xs">
                      {doc.extractedData?.rating?.current && (
                        <div>
                          <span className="text-green-300">RATING:</span>
                          <span className="ml-1 font-semibold">{doc.extractedData.rating.current}</span>
                        </div>
                      )}
                      {doc.extractedData?.valuationMethod && (
                        <div>
                          <span className="text-green-300">METHOD:</span>
                          <span className="ml-1 font-semibold">{doc.extractedData.valuationMethod}</span>
                        </div>
                      )}
                    </div>
                    
                    {doc.extractedData?.catalysts && doc.extractedData.catalysts.length > 0 && (
                      <div className="mb-3">
                        <span className="text-green-300 text-xs font-semibold">CATALYSTS:</span>
                        <ul className="space-y-1 text-sm mt-1">
                          {doc.extractedData.catalysts.slice(0, 3).map((catalyst, i) => (
                            <li key={i} className="text-green-300">• {catalyst}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <ul className="space-y-1 text-sm">
                      {doc.keyPoints.map((point, i) => (
                        <li key={i} className="text-green-300">• {point}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return isExpanded ? <ExpandedView /> : <CompactView />;
};