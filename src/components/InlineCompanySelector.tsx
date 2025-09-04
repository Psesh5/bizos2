import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { fmpApi } from "@/services/fmp-api";

interface Company {
  symbol: string;
  name: string;
  currency: string;
  stockExchange: string;
  exchangeShortName?: string;
}

interface InlineCompanySelectorProps {
  currentSymbol: string;
  currentCompanyName: string;
  onCompanyChange: (symbol: string, companyName: string) => void;
  className?: string;
}

export function InlineCompanySelector({ 
  currentSymbol, 
  currentCompanyName, 
  onCompanyChange, 
  className 
}: InlineCompanySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [popularCompanies] = useState<Company[]>([
    { symbol: 'AAPL', name: 'Apple Inc.', currency: 'USD', stockExchange: 'NASDAQ' },
    { symbol: 'MSFT', name: 'Microsoft Corporation', currency: 'USD', stockExchange: 'NASDAQ' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', currency: 'USD', stockExchange: 'NASDAQ' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', currency: 'USD', stockExchange: 'NASDAQ' },
    { symbol: 'TSLA', name: 'Tesla Inc.', currency: 'USD', stockExchange: 'NASDAQ' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', currency: 'USD', stockExchange: 'NASDAQ' },
    { symbol: 'META', name: 'Meta Platforms Inc.', currency: 'USD', stockExchange: 'NASDAQ' },
    { symbol: 'NFLX', name: 'Netflix Inc.', currency: 'USD', stockExchange: 'NASDAQ' },
  ]);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const searchCompanies = async (query: string) => {
    if (!query || query.length < 2) {
      setCompanies(popularCompanies);
      return;
    }

    setLoading(true);
    try {
      const results = await fmpApi.searchCompanies(query);
      setCompanies(results.slice(0, 10)); // Limit to top 10 results
    } catch (error) {
      console.error('Error searching companies:', error);
      setCompanies(popularCompanies);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for search
    searchTimeoutRef.current = setTimeout(() => {
      searchCompanies(value);
    }, 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && companies.length > 0) {
      e.preventDefault();
      // Select the first company in the list
      handleCompanySelect(companies[0]);
    }
  };

  const handleCompanySelect = (company: Company) => {
    onCompanyChange(company.symbol, company.name);
    setIsOpen(false);
    setSearchTerm('');
  };

  const getCompanyLogo = (symbol: string) => {
    return `https://financialmodelingprep.com/image-stock/${symbol}.png`;
  };

  // Initialize with popular companies when opened
  useEffect(() => {
    if (isOpen && companies.length === 0) {
      setCompanies(popularCompanies);
    }
  }, [isOpen, companies.length, popularCompanies]);

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      {/* Current Company Display Button */}
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-between w-full bg-white/80 border border-primary/20 hover:border-primary/40 transition-colors",
          className?.includes('h-6') ? "px-2 py-1 h-6 text-xs" : "px-4 py-2 h-auto space-x-3"
        )}
      >
        <div className={cn("flex items-center", className?.includes('h-6') ? "space-x-1" : "space-x-3")}>
          <div className="relative">
            <img 
              src={getCompanyLogo(currentSymbol)} 
              alt={currentCompanyName}
              className={cn("rounded-lg", className?.includes('h-6') ? "h-4 w-4" : "h-8 w-8")}
              onError={(e) => {
                const size = className?.includes('h-6') ? '16' : '32';
                const fontSize = className?.includes('h-6') ? '10' : '14';
                const fallbackSvg = `data:image/svg+xml;base64,${btoa(`
                  <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="${size}" height="${size}" rx="4" fill="#3b82f6"/>
                    <text x="${parseInt(size)/2}" y="${parseInt(size)/2 + 3}" font-family="Arial" font-size="${fontSize}" font-weight="bold" fill="white" text-anchor="middle">${currentSymbol.charAt(0)}</text>
                  </svg>
                `)}`;
                e.currentTarget.src = fallbackSvg;
              }}
            />
          </div>
          {className?.includes('h-6') ? (
            <span className="font-medium text-xs text-foreground truncate max-w-20">
              {currentSymbol}
            </span>
          ) : (
            <div className="flex flex-col items-start">
              <span className="font-semibold text-sm text-foreground">{currentCompanyName}</span>
              <span className="text-xs text-muted-foreground">{currentSymbol}</span>
            </div>
          )}
        </div>
        <ChevronDown className={cn("transition-transform", 
          className?.includes('h-6') ? "h-3 w-3" : "h-4 w-4",
          isOpen && "transform rotate-180"
        )} />
      </Button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search companies..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-10"
                autoFocus
              />
            </div>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-muted-foreground">
                <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                Searching...
              </div>
            ) : companies.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                No companies found
              </div>
            ) : (
              <>
                {!searchTerm && (
                  <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border">
                    Popular Companies
                  </div>
                )}
                {companies.map((company) => (
                  <button
                    key={`${company.symbol}-${company.stockExchange}`}
                    onClick={() => handleCompanySelect(company)}
                    className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="relative flex-shrink-0">
                      <img 
                        src={getCompanyLogo(company.symbol)} 
                        alt={company.name}
                        className="h-8 w-8 rounded-lg"
                        onError={(e) => {
                          const fallbackSvg = `data:image/svg+xml;base64,${btoa(`
                            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <rect width="32" height="32" rx="8" fill="#3b82f6"/>
                              <text x="16" y="20" font-family="Arial" font-size="14" font-weight="bold" fill="white" text-anchor="middle">${company.symbol.charAt(0)}</text>
                            </svg>
                          `)}`;
                          e.currentTarget.src = fallbackSvg;
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">
                        {company.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {company.symbol} • {company.exchangeShortName || company.stockExchange}
                      </p>
                    </div>
                    {company.symbol === currentSymbol && (
                      <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                    )}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}