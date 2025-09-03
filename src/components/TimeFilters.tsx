import { TimeFilter, ConfidenceLevel } from '../types/event';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface TimeFiltersProps {
  selectedTime: TimeFilter;
  onTimeChange: (time: TimeFilter) => void;
  selectedConfidence: ConfidenceLevel[];
  onConfidenceChange: (confidence: ConfidenceLevel[]) => void;
}

const timeOptions: { value: TimeFilter; label: string }[] = [
  { value: '1h', label: '1H' },
  { value: '6h', label: '6H' },
  { value: '24h', label: '24H' },
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
];

const confidenceOptions: { value: ConfidenceLevel; label: string; color: string }[] = [
  { value: 'high', label: 'High', color: 'confidence-high' },
  { value: 'medium', label: 'Medium', color: 'confidence-medium' },
  { value: 'low', label: 'Low', color: 'confidence-low' },
];

export function TimeFilters({ 
  selectedTime, 
  onTimeChange, 
  selectedConfidence, 
  onConfidenceChange 
}: TimeFiltersProps) {
  const toggleConfidence = (confidence: ConfidenceLevel) => {
    if (selectedConfidence.includes(confidence)) {
      onConfidenceChange(selectedConfidence.filter(c => c !== confidence));
    } else {
      onConfidenceChange([...selectedConfidence, confidence]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Time Filter */}
      <div className="bg-surface-elevated rounded-lg border border-border p-4">
        <h3 className="font-semibold text-foreground mb-4">Time Range</h3>
        <div className="grid grid-cols-5 gap-1">
          {timeOptions.map((option) => (
            <Button
              key={option.value}
              variant={selectedTime === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => onTimeChange(option.value)}
              className={`text-xs font-mono ${
                selectedTime === option.value 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-primary/10'
              }`}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Confidence Filter */}
      <div className="bg-surface-elevated rounded-lg border border-border p-4">
        <h3 className="font-semibold text-foreground mb-4">Confidence</h3>
        <div className="space-y-2">
          {confidenceOptions.map((option) => {
            const isSelected = selectedConfidence.includes(option.value);
            return (
              <button
                key={option.value}
                onClick={() => toggleConfidence(option.value)}
                className={`w-full text-left p-2 rounded-md border transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-border/60 hover:bg-surface/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: `hsl(var(--${option.color}))` }}
                    />
                    <span className="text-sm font-medium text-foreground">
                      {option.label}
                    </span>
                  </div>
                  {isSelected && (
                    <Badge variant="secondary" className="text-xs">
                      ✓
                    </Badge>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}