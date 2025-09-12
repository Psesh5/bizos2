import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Maximize2, Minimize2 } from 'lucide-react';
import { WidgetProps } from '@/types/widget';
import { anomalyDetection } from '@/services/anomaly-detection';

interface AbnormalEvent {
  id: string;
  date: string;
  type: 'mutation' | 'variant' | 'anomaly';
  severity: 'high' | 'medium' | 'low';
  sequence: string;
  description: string;
  position: number; // Position along the helix (0-100)
  gainLoss: string;
  close: string;
  newsLink: string;
}

export const AbnormalEventSequencerWidget: React.FC<WidgetProps> = ({ 
  widget, 
  onRemove, 
  isExpanded = false,
  onToggleExpanded
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [selectedSequence, setSelectedSequence] = useState<string | null>(null);
  const [scanPosition, setScanPosition] = useState(0);
  const [highlightedAnomaly, setHighlightedAnomaly] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const mockAbnormalEvents: AbnormalEvent[] = [
    {
      id: 'seq_001',
      date: '1/3/2025',
      type: 'mutation',
      severity: 'high',
      sequence: 'ATCG-GCTA-TTAG',
      description: 'Critical market anomaly detected in trading sequence',
      position: 15,
      gainLoss: '15.14%',
      close: '28.74',
      newsLink: '1/3/2025-Trending stocks on AllStreetBets include Rocket Lab'
    },
    {
      id: 'seq_002', 
      date: '4/9/2025',
      type: 'variant',
      severity: 'medium',
      sequence: 'CGAT-AATC-GCGC',
      description: 'Unusual volatility pattern in price movement',
      position: 35,
      gainLoss: '19.85%',
      close: '20.59',
      newsLink: '4/8/2025-Wells Fargo maintains equal-weight on Rocket Lab, lowers price target'
    },
    {
      id: 'seq_003',
      date: '5/27/2025',
      type: 'mutation',
      severity: 'high',
      sequence: 'TTCG-AAGT-CCTA',
      description: 'High volatility detected',
      position: 55,
      gainLoss: '13.14%',
      close: '28.76',
      newsLink: '5/22/2025-Rocket Lab plans 65th launch with Full Stream Ahead mission for BlackSky'
    },
    {
      id: 'seq_004',
      date: '8/22/2025',
      type: 'variant',
      severity: 'medium',
      sequence: 'GCTA-TTAG-ATCG',
      description: 'Market variant detected',
      position: 75,
      gainLoss: '6.86%',
      close: '44.38',
      newsLink: '8/21/2025-Rocket Lab deal with Middle Eastern airline Air-Starlink deal'
    },
    {
      id: 'seq_005',
      date: '5/9/2025',
      type: 'anomaly',
      severity: 'low',
      sequence: 'AATC-GCGC-CGAT',
      description: 'Market anomaly detected',
      position: 62,
      gainLoss: '-11.21%',
      close: '20.51',
      newsLink: '5/8/2025-Rocket Lab Q1 earnings beat estimates; partnership with U.S. Air Force for Neutron launch'
    },
    {
      id: 'seq_006',
      date: '8/19/2025',
      type: 'anomaly',
      severity: 'low',
      sequence: 'CCTA-GCTA-AAGT',
      description: 'Minor market deviation',
      position: 85,
      gainLoss: '-9.01%',
      close: '40.92',
      newsLink: '8/18/2025-Rocket Lab acquires analyst confidence in defense growth'
    }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return '#ef4444';
      case 'medium': return '#f97316'; 
      case 'low': return '#22c55e';
      default: return '#94a3b8';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'mutation': return '🧬';
      case 'variant': return '⚡';
      case 'anomaly': return '🔬';
      default: return '•';
    }
  };

  // Generate DNA helix path coordinates with higher precision
  const generateHelixPath = (width: number, height: number) => {
    const points1 = [];
    const points2 = [];
    const steps = 400; // Increased from 100 for smoother curves
    
    for (let i = 0; i <= steps; i++) {
      const x = Math.round((i / steps) * width * 100) / 100; // Round to 2 decimal places
      const angle = (i / steps) * Math.PI * 6; // 6 complete turns
      const amplitude = height * 0.3;
      const centerY = height / 2;
      
      const y1 = Math.round((centerY + Math.sin(angle) * amplitude) * 100) / 100;
      const y2 = Math.round((centerY + Math.sin(angle + Math.PI) * amplitude) * 100) / 100;
      
      points1.push(`${x},${y1}`);
      points2.push(`${x},${y2}`);
    }
    
    return {
      strand1: `M ${points1.join(' L ')}`,
      strand2: `M ${points2.join(' L ')}`
    };
  };

  // Get position along helix for anomaly markers
  const getHelixPosition = (position: number, width: number, height: number) => {
    const x = (position / 100) * width;
    const angle = (position / 100) * Math.PI * 6;
    const amplitude = height * 0.3;
    const centerY = height / 2;
    const y = centerY + Math.sin(angle) * amplitude;
    
    return { x, y };
  };

  const helixWidth = isExpanded ? 800 : 400;
  const helixHeight = isExpanded ? 200 : 100;
  const helixPaths = React.useMemo(() => generateHelixPath(helixWidth, helixHeight), [helixWidth, helixHeight]);

  // Sort anomalies by position for methodical scanning (memoized to prevent re-creation)
  const sortedAnomalies = React.useMemo(() => {
    return [...mockAbnormalEvents].sort((a, b) => a.position - b.position);
  }, []);

  // Calculate the 1-2 most abnormal events based on severity and gain/loss magnitude
  const mostAbnormalEvents = React.useMemo(() => {
    const scored = mockAbnormalEvents.map(item => {
      const severityScore = item.severity === 'high' ? 3 : item.severity === 'medium' ? 2 : 1;
      const gainLossScore = Math.abs(parseFloat(item.gainLoss.replace('%', '')));
      return {
        ...item,
        abnormalityScore: severityScore * 10 + gainLossScore // Weight severity heavily
      };
    });
    
    return scored
      .sort((a, b) => b.abnormalityScore - a.abnormalityScore)
      .slice(0, 2); // Take top 2 most abnormal
  }, []);

  const [highlightedAbnormals, setHighlightedAbnormals] = useState<string[]>([]);

  // Consistent scanning effect with anomaly highlighting
  useEffect(() => {
    if (!isScanning) {
      setScanPosition(0);
      setHighlightedAnomaly(null);
      setHighlightedAbnormals([]);
      return;
    }

    const startScan = () => {
      // Immediately highlight the most abnormal events when scan starts
      const abnormalIds = mostAbnormalEvents.map(event => event.id);
      setHighlightedAbnormals(abnormalIds);
      
      const scanDuration = 5000; // Total scan time
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / scanDuration, 1);
        
        // Move scan beam consistently across timeline
        setScanPosition(progress * helixWidth);
        
        // Check which anomaly we're currently at
        const currentPosition = progress * 100;
        const currentAnomaly = sortedAnomalies.find(anomaly => {
          const threshold = 3; // 3% threshold around each anomaly
          return Math.abs(anomaly.position - currentPosition) <= threshold;
        });
        
        if (currentAnomaly && highlightedAnomaly !== currentAnomaly.id) {
          setHighlightedAnomaly(currentAnomaly.id);
        } else if (!currentAnomaly && highlightedAnomaly) {
          setHighlightedAnomaly(null);
        }
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // Complete the scan - keep abnormals highlighted for a moment
          setTimeout(() => {
            setIsScanning(false);
            setScanPosition(0);
            setHighlightedAnomaly(null);
            // Keep abnormals highlighted for 2 seconds after scan completes
            setTimeout(() => {
              setHighlightedAbnormals([]);
            }, 2000);
          }, 500);
        }
      };
      
      requestAnimationFrame(animate);
    };

    startScan();
  }, [isScanning]);

  const handleScan = () => {
    console.log('Methodical scan initiated');
    setIsScanning(true);
  };

  if (!isExpanded) {
    // Compact view matching mobile Lovable design
    return (
      <div className="p-2 bg-card text-card-foreground font-mono">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <h3 className="text-xs font-bold">SEQUENCER</h3>
          </div>
          <div className="flex items-center gap-1">
            <Button 
              onClick={handleScan}
              disabled={isScanning}
              size="sm"
              className="bg-blue-600 text-white font-mono text-xs hover:bg-blue-700 h-6 px-2"
            >
              {isScanning ? 'SCAN...' : 'SCAN'}
            </Button>
            {onToggleExpanded && (
              <Button
                onClick={onToggleExpanded}
                size="sm"
                variant="outline"
                className="h-6 w-6 p-0"
              >
                <Maximize2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Compact DNA visualization */}
        <div className="mb-3">
          <svg 
            width="100%" 
            height="50"
            className="mx-auto"
            viewBox={`0 0 ${helixWidth} 50`}
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient id="compactStrand1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(150 80% 45%)" stopOpacity="0.8"/>
                <stop offset="100%" stopColor="hsl(150 80% 55%)" stopOpacity="1"/>
              </linearGradient>
              <linearGradient id="compactStrand2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(200 80% 60%)" stopOpacity="0.8"/>
                <stop offset="100%" stopColor="hsl(200 80% 70%)" stopOpacity="1"/>
              </linearGradient>
              <filter id="compactGlow">
                <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
                <feMerge> 
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            {/* Simplified helix strands */}
            <path
              d={generateHelixPath(helixWidth, 50).strand1}
              stroke="url(#compactStrand1)"
              strokeWidth="2"
              fill="none"
              filter="url(#compactGlow)"
              className={isScanning ? 'animate-pulse' : ''}
            />
            <path
              d={generateHelixPath(helixWidth, 50).strand2}
              stroke="url(#compactStrand2)"
              strokeWidth="2"
              fill="none"
              filter="url(#compactGlow)"
              className={isScanning ? 'animate-pulse' : ''}
            />
            
            {/* Anomaly markers */}
            {mockAbnormalEvents.map((item) => {
              const pos = getHelixPosition(item.position, helixWidth, 50);
              const isAbnormal = highlightedAbnormals.includes(item.id);
              return (
                <g key={item.id}>
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="3"
                    fill={isAbnormal ? "#fbbf24" : getSeverityColor(item.severity)}
                    className="cursor-pointer"
                    onClick={() => setSelectedSequence(selectedSequence === item.id ? null : item.id)}
                  />
                  {isAbnormal && (
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r="6"
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth="1"
                      className="animate-pulse"
                    />
                  )}
                </g>
              );
            })}
            
            {/* Scanning beam */}
            {isScanning && (
              <line
                x1={scanPosition}
                y1="0"
                x2={scanPosition}
                y2="50"
                stroke="hsl(150 80% 45%)"
                strokeWidth="2"
                opacity="0.9"
                filter="url(#compactGlow)"
              />
            )}
          </svg>
        </div>
        
        {/* High Priority Threats */}
        {mockAbnormalEvents.filter(e => e.severity === 'high').length > 0 && (
          <div className="mb-3">
            <div className="text-xs font-bold text-red-500 mb-2 flex items-center gap-1">
              🧬 HIGH PRIORITY THREATS ({mockAbnormalEvents.filter(e => e.severity === 'high').length})
            </div>
            <div className="space-y-1">
              {mockAbnormalEvents
                .filter(e => e.severity === 'high')
                .slice(0, 2)
                .map((threat, index) => (
                  <div key={threat.id} className="text-xs bg-red-500/10 border border-red-500/20 rounded p-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-red-600">{threat.id}</span>
                      <span className="text-red-500">{threat.gainLoss}</span>
                    </div>
                    <div className="text-muted-foreground mt-1 truncate">{threat.description}</div>
                    <div className="text-blue-400 font-mono text-xs mt-1">{threat.sequence}</div>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* Status indicators */}
        <div className="grid grid-cols-3 gap-1 text-xs">
          <div className="text-center">
            <div className="text-red-500 font-bold text-lg">{mockAbnormalEvents.filter(e => e.severity === 'high').length}</div>
            <div className="text-muted-foreground text-xs">HIGH</div>
          </div>
          <div className="text-center">
            <div className="text-orange-500 font-bold text-lg">{mockAbnormalEvents.filter(e => e.severity === 'medium').length}</div>
            <div className="text-muted-foreground text-xs">MED</div>
          </div>
          <div className="text-center">
            <div className="text-green-500 font-bold text-lg">{mockAbnormalEvents.filter(e => e.severity === 'low').length}</div>
            <div className="text-muted-foreground text-xs">LOW</div>
          </div>
        </div>
      </div>
    );
  }

  // Full expanded view - exact replica of DNA sequencer
  return (
    <div className="p-4 bg-card text-card-foreground font-mono h-full overflow-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <h1 className="text-xl font-bold text-blue-600">
            ABNORMAL EVENT SEQUENCER v3.2.1
          </h1>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge className="font-mono bg-muted text-foreground border border-border text-xs">
              ANALYZING MARKET GENOME
            </Badge>
            <Button 
              onClick={handleScan}
              disabled={isScanning}
              size="sm"
              className="bg-blue-600 text-white font-mono hover:bg-blue-700"
            >
              {isScanning ? 'SCANNING...' : 'INITIATE SCAN'}
            </Button>
          </div>
          {onToggleExpanded && (
            <Button
              onClick={onToggleExpanded}
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* DNA Double Helix Timeline */}
      <Card className="mb-6 p-6 bg-card border-border text-card-foreground">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <h2 className="text-lg font-semibold">DNA DOUBLE HELIX TIMELINE</h2>
        </div>
        
        <div className="relative mb-4 overflow-x-auto">
          <svg 
            width={helixWidth} 
            height={helixHeight + 40}
            className="mx-auto"
            style={{ minWidth: helixWidth }}
            shapeRendering="geometricPrecision"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Enhanced Definitions */}
            <defs>
              {/* Background grid pattern */}
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#334155" strokeWidth="0.5" opacity="0.2"/>
              </pattern>
              
              {/* DNA Strand Gradients */}
              <linearGradient id="strand1Gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(150 80% 45%)" stopOpacity="0.3"/>
                <stop offset="25%" stopColor="hsl(150 80% 45%)" stopOpacity="0.8"/>
                <stop offset="50%" stopColor="hsl(150 80% 55%)" stopOpacity="1"/>
                <stop offset="75%" stopColor="hsl(150 80% 45%)" stopOpacity="0.8"/>
                <stop offset="100%" stopColor="hsl(150 80% 45%)" stopOpacity="0.3"/>
              </linearGradient>
              
              <linearGradient id="strand2Gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(200 80% 60%)" stopOpacity="0.3"/>
                <stop offset="25%" stopColor="hsl(200 80% 60%)" stopOpacity="0.8"/>
                <stop offset="50%" stopColor="hsl(200 80% 70%)" stopOpacity="1"/>
                <stop offset="75%" stopColor="hsl(200 80% 60%)" stopOpacity="0.8"/>
                <stop offset="100%" stopColor="hsl(200 80% 60%)" stopOpacity="0.3"/>
              </linearGradient>
              
              {/* Crisp Glow Filters with reduced blur */}
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                <feMerge> 
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              
              <filter id="strongGlow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                <feMerge> 
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              
              {/* Sharp filter for crisp edges */}
              <filter id="crisp">
                <feMorphology operator="dilate" radius="0.5"/>
              </filter>
              
              {/* Base Pair Gradient */}
              <linearGradient id="basePairGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="hsl(200 80% 60%)" stopOpacity="0.8"/>
                <stop offset="50%" stopColor="hsl(120 70% 85%)" stopOpacity="0.9"/>
                <stop offset="100%" stopColor="hsl(150 80% 45%)" stopOpacity="0.8"/>
              </linearGradient>
            </defs>
            
            <rect width="100%" height="100%" fill="url(#grid)" />
            
            {/* DNA Double Helix Strands */}
            <g>
              {/* Crisp Strand 1 with enhanced definition */}
              <path
                d={helixPaths.strand1}
                stroke="url(#strand1Gradient)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                filter="url(#glow)"
                opacity="1"
                vectorEffect="non-scaling-stroke"
                className={isScanning ? 'animate-pulse' : ''}
              />
              
              {/* Crisp Strand 2 with enhanced definition */}
              <path
                d={helixPaths.strand2}
                stroke="url(#strand2Gradient)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                filter="url(#glow)"
                opacity="1"
                vectorEffect="non-scaling-stroke"
                className={isScanning ? 'animate-pulse' : ''}
              />
              
              {/* Enhanced Cross-links between strands */}
              {Array.from({ length: 30 }, (_, i) => {
                const position = (i / 29) * 100;
                const pos1 = getHelixPosition(position, helixWidth, helixHeight);
                const angle = (position / 100) * Math.PI * 6;
                const amplitude = helixHeight * 0.3;
                const centerY = helixHeight / 2;
                const y2 = centerY + Math.sin(angle + Math.PI) * amplitude;
                
                return (
                  <g key={i}>
                    {/* Main base pair connection - crisper */}
                    <line
                      x1={Math.round(pos1.x * 10) / 10}
                      y1={Math.round(pos1.y * 10) / 10}
                      x2={Math.round(pos1.x * 10) / 10}
                      y2={Math.round(y2 * 10) / 10}
                      stroke="url(#basePairGradient)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      opacity="0.9"
                      filter="url(#glow)"
                      vectorEffect="non-scaling-stroke"
                    />
                    
                    {/* Base pair nodes */}
                    <circle
                      cx={pos1.x}
                      cy={pos1.y}
                      r="2"
                      fill="hsl(150 80% 45%)"
                      filter="url(#glow)"
                      opacity="0.9"
                    />
                    <circle
                      cx={pos1.x}
                      cy={y2}
                      r="2"
                      fill="hsl(200 80% 60%)"
                      filter="url(#glow)"
                      opacity="0.9"
                    />
                  </g>
                );
              })}
            </g>
            
            {/* Enhanced Anomaly Markers */}
            {mockAbnormalEvents.map((item) => {
              const pos = getHelixPosition(item.position, helixWidth, helixHeight);
              const isAbnormal = highlightedAbnormals.includes(item.id);
              return (
                <g key={item.id}>
                  {/* Special abnormal event highlight ring */}
                  {isAbnormal && (
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r="20"
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth="3"
                      opacity="0.6"
                      filter="url(#strongGlow)"
                      className="animate-pulse"
                    />
                  )}
                  
                  {/* Outer glow ring */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="12"
                    fill="none"
                    stroke={isAbnormal ? "#fbbf24" : getSeverityColor(item.severity)}
                    strokeWidth="2"
                    opacity={isAbnormal ? "0.8" : "0.3"}
                    filter="url(#strongGlow)"
                    className={`${selectedSequence === item.id || isAbnormal ? 'animate-pulse' : ''}`}
                  />
                  
                  {/* Main Marker Circle */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="8"
                    fill={isAbnormal ? "#fbbf24" : getSeverityColor(item.severity)}
                    stroke="hsl(220 13% 8%)"
                    strokeWidth="2"
                    className="cursor-pointer transition-all duration-200 hover:opacity-80"
                    onClick={() => setSelectedSequence(selectedSequence === item.id ? null : item.id)}
                    filter="url(#strongGlow)"
                    style={{
                      transform: isAbnormal ? 'scale(1.3)' : 'scale(1)',
                    }}
                  />
                  
                  {/* Inner pulse dot */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="3"
                    fill="hsl(120 70% 85%)"
                    opacity="0.8"
                    className={isAbnormal ? "animate-ping" : "animate-pulse"}
                  />
                  
                  {/* Enhanced Marker Label */}
                  <text
                    x={pos.x}
                    y={pos.y - 20}
                    textAnchor="middle"
                    fill={isAbnormal ? "#fbbf24" : "hsl(120 70% 85%)"}
                    fontSize="10"
                    fontFamily="monospace"
                    filter="url(#glow)"
                    fontWeight="bold"
                  >
                    {item.id}
                  </text>
                  
                  {/* Abnormal event indicator */}
                  {isAbnormal && (
                    <text
                      x={pos.x}
                      y={pos.y - 35}
                      textAnchor="middle"
                      fill="#fbbf24"
                      fontSize="8"
                      fontFamily="monospace"
                      filter="url(#glow)"
                      fontWeight="bold"
                      className="animate-pulse"
                    >
                      ⚠ ABNORMAL
                    </text>
                  )}
                  
                  {/* Enhanced Hover tooltip card */}
                  {selectedSequence === item.id && (
                    <g>
                      {/* Card background */}
                      <rect
                        x={pos.x - 80}
                        y={pos.y + 15}
                        width="160"
                        height="80"
                        fill="hsl(220 15% 12%)"
                        stroke="hsl(220 15% 20%)"
                        strokeWidth="1"
                        rx="6"
                        filter="url(#glow)"
                      />
                      
                      {/* Gain/Loss */}
                      <text
                        x={pos.x - 70}
                        y={pos.y + 30}
                        fill={item.gainLoss.includes('-') ? '#ef4444' : '#22c55e'}
                        fontSize="11"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        ● Gain/Loss: {item.gainLoss}
                      </text>
                      
                      {/* Close price */}
                      <text
                        x={pos.x - 70}
                        y={pos.y + 45}
                        fill="hsl(120 70% 85%)"
                        fontSize="10"
                        fontFamily="monospace"
                      >
                        Close: {item.close}
                      </text>
                      
                      {/* Date */}
                      <text
                        x={pos.x - 70}
                        y={pos.y + 60}
                        fill="hsl(120 20% 60%)"
                        fontSize="10"
                        fontFamily="monospace"
                      >
                        Date: {item.date}
                      </text>
                      
                      {/* News link preview */}
                      <text
                        x={pos.x - 70}
                        y={pos.y + 75}
                        fill="#06b6d4"
                        fontSize="8"
                        fontFamily="monospace"
                      >
                        1. {item.newsLink.length > 25 ? item.newsLink.substring(0, 25) + '...' : item.newsLink}
                      </text>
                      
                      {/* Continuation for longer text */}
                      {item.newsLink.length > 25 && (
                        <text
                          x={pos.x - 70}
                          y={pos.y + 87}
                          fill="#06b6d4"
                          fontSize="8"
                          fontFamily="monospace"
                        >
                          {item.newsLink.substring(25, 50)}...
                        </text>
                      )}
                    </g>
                  )}
                </g>
              );
            })}
            
            {/* Timeline Labels */}
            <text x="20" y={helixHeight + 30} fill="hsl(120 20% 60%)" fontSize="12" fontFamily="monospace">
              PAST
            </text>
            <text x={helixWidth - 60} y={helixHeight + 30} fill="hsl(120 20% 60%)" fontSize="12" fontFamily="monospace">
              PRESENT
            </text>
            
            {/* Methodical scanning beam effect */}
            {isScanning && (
              <line
                x1={scanPosition}
                y1="0"
                x2={scanPosition}
                y2={helixHeight}
                stroke="hsl(150 80% 45%)"
                strokeWidth="3"
                opacity="0.9"
                filter="url(#strongGlow)"
                style={{
                  transition: 'x1 0.5s ease-in-out, x2 0.5s ease-in-out',
                  filter: 'drop-shadow(0 0 12px hsl(150 80% 45%))'
                }}
              />
            )}
          </svg>
        </div>
      </Card>

      {/* Anomalies Analysis Section */}
      <Card className="p-6 bg-card border-border text-card-foreground">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <h3 className="text-lg font-semibold">DETECTED GENETIC ANOMALIES</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockAbnormalEvents.map((item) => (
            <div 
              key={item.id}
              className={`p-4 rounded-lg border cursor-pointer transition-all duration-300 ${
                selectedSequence === item.id ? 'border-2' : ''
              } ${
                highlightedAnomaly === item.id ? 'animate-pulse ring-2 ring-green-500' : ''
              } ${
                highlightedAnomaly === item.id 
                  ? 'bg-green-500/20 border-green-500 text-card-foreground' 
                  : selectedSequence === item.id 
                    ? 'bg-card border-blue-600 text-card-foreground' 
                    : 'bg-muted border-border text-card-foreground'
              }`}
              style={{ 
                transform: highlightedAnomaly === item.id ? 'scale(1.02)' : 'scale(1)'
              }}
              onClick={() => setSelectedSequence(selectedSequence === item.id ? null : item.id)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getTypeIcon(item.type)}</span>
                  <span className="font-mono text-sm text-muted-foreground">
                    {item.id}
                  </span>
                </div>
                <Badge className="font-mono text-xs bg-transparent border border-current"
                  style={{ 
                    backgroundColor: getSeverityColor(item.severity) + '33',
                    color: getSeverityColor(item.severity),
                    borderColor: getSeverityColor(item.severity)
                  }}
                >
                  {item.severity.toUpperCase()}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="font-mono text-sm">{item.date}</div>
                <div className="font-mono text-xs tracking-wider text-blue-400">
                  {item.sequence}
                </div>
                <div className="text-xs capitalize text-muted-foreground">
                  Type: {item.type}
                </div>
              </div>
              
              {selectedSequence === item.id && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="text-sm mb-4">{item.description}</div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      className="bg-blue-600 text-white font-mono text-xs hover:bg-blue-700"
                    >
                      ISOLATE
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="border-blue-600 text-blue-600 font-mono text-xs hover:bg-blue-600/10"
                    >
                      ANALYZE
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Status Bar */}
      <Card className="mt-6 p-4 bg-card border-border text-card-foreground">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="font-mono text-xs">SYSTEM STATUS: OPERATIONAL</span>
            </div>
            <div className="font-mono text-xs text-muted-foreground">
              SEQUENCES ANALYZED: {mockAbnormalEvents.length} | MUTATIONS: {mockAbnormalEvents.filter(d => d.type === 'mutation').length}
            </div>
          </div>
          <div className="font-mono text-xs text-muted-foreground">
            LAB-ID: DNA-HELIX-2024 | VER: 3.2.1
          </div>
        </div>
      </Card>
    </div>
  );
};