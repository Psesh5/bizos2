import { useState } from 'react';
import { Search, TrendingUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearchQueryChange: (query: string) => void;
}

const popularTickers = ['AAPL', 'TSLA', 'NVDA', 'META', 'AMZN', 'MSFT', 'GOOGL', 'NFLX'];

export function SearchBar({ value, onChange, onSearchQueryChange }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchQueryChange(searchQuery);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Input
              placeholder="Enter stock ticker (e.g., AAPL, TSLA)"
              value={value}
              onChange={(e) => onChange(e.target.value.toUpperCase())}
              className="text-lg font-mono tracking-wide bg-surface-elevated border-border focus:border-primary"
            />
            <TrendingUp className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          </div>
        </div>
        
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <Input
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 bg-surface-elevated border-border focus:border-primary"
          />
          <Button type="submit" variant="default" size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </form>
      </div>

      {!value && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground">Popular:</span>
          {popularTickers.map((ticker) => (
            <Button
              key={ticker}
              variant="outline"
              size="sm"
              onClick={() => onChange(ticker)}
              className="text-xs font-mono hover:bg-primary/10 hover:border-primary/30"
            >
              {ticker}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}