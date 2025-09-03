import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Minus, Edit3, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface CompanyData {
  name: string;
  symbol: string;
  exchangeShortName: string;
  currency?: string;
  stockExchange?: string;
}

interface HeaderStockPriceProps {
  symbol: string;
  onCompanyChange: (company: CompanyData) => void;
}

interface StockPriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

// Use the same global API service for stock price data
const fetchStockPrice = async (symbol: string): Promise<StockPriceData> => {
  // Check if global API service is available
  if (!(window as any).apiService?.getCompanyQuote) {
    // Fallback to FMP API directly
    const API_KEY = 'QLmCqVKpw5uZHM6sFs69VSSDDlU3xiPy';
    const response = await fetch(
      `https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch stock price');
    }
    
    const data = await response.json();
    const quote = Array.isArray(data) ? data[0] : data;
    
    return {
      symbol: quote.symbol,
      price: quote.price,
      change: quote.change,
      changePercent: quote.changesPercentage,
      timestamp: new Date().toISOString(),
    };
  }
  
  // Use the global API service if available
  try {
    const quote = await (window as any).apiService.getCompanyQuote(symbol);
    return {
      symbol: quote.symbol,
      price: quote.price,
      change: quote.change,
      changePercent: quote.changesPercentage,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error fetching stock price:', error);
    throw error;
  }
};

let searchTimeout: NodeJS.Timeout;

export const HeaderStockPrice = ({ symbol, onCompanyChange }: HeaderStockPriceProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editSymbol, setEditSymbol] = useState(symbol);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['header-stock-price', symbol],
    queryFn: () => fetchStockPrice(symbol),
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 3,
  });

  // Search companies as user types
  const searchCompanies = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    if ((window as any).apiService?.searchCompanies) {
      try {
        const results = await (window as any).apiService.searchCompanies(query);
        setSearchResults(results.slice(0, 5)); // Limit to 5 results
        setShowDropdown(results.length > 0);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
        setShowDropdown(false);
      }
    }
  };

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditSymbol(symbol);
    setSearchResults([]);
    setShowDropdown(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditSymbol(symbol);
    setSearchResults([]);
    setShowDropdown(false);
  };

  const handleInputChange = (value: string) => {
    const upperValue = value.toUpperCase();
    setEditSymbol(upperValue);
    
    // Debounce search
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      searchCompanies(upperValue);
    }, 300);
  };

  const handleSelectCompany = (company: any) => {
    const companyData: CompanyData = {
      name: company.name,
      symbol: company.symbol,
      exchangeShortName: company.exchangeShortName || 'NASDAQ',
      currency: company.currency,
      stockExchange: company.stockExchange
    };
    onCompanyChange(companyData);
    setIsEditing(false);
    setSearchResults([]);
    setShowDropdown(false);
  };

  const handleSaveEdit = async () => {
    const newSymbol = editSymbol.toUpperCase().trim();
    if (newSymbol && newSymbol !== symbol) {
      try {
        // Try to fetch company info for validation
        if ((window as any).apiService?.searchCompanies) {
          const results = await (window as any).apiService.searchCompanies(newSymbol);
          const company = results.find((c: any) => c.symbol === newSymbol);
          
          if (company) {
            // Found the company, use full data
            const companyData: CompanyData = {
              name: company.name,
              symbol: company.symbol,
              exchangeShortName: company.exchangeShortName || 'NASDAQ',
              currency: company.currency,
              stockExchange: company.stockExchange
            };
            onCompanyChange(companyData);
          } else {
            // Company not found in search, use basic data
            const basicCompanyData: CompanyData = {
              name: `${newSymbol} Corporation`,
              symbol: newSymbol,
              exchangeShortName: 'NASDAQ'
            };
            onCompanyChange(basicCompanyData);
          }
        } else {
          // No API service available, use basic data
          const basicCompanyData: CompanyData = {
            name: `${newSymbol} Corporation`,
            symbol: newSymbol,
            exchangeShortName: 'NASDAQ'
          };
          onCompanyChange(basicCompanyData);
        }
        setIsEditing(false);
      } catch (error) {
        console.error('Error changing company:', error);
        // Still allow the change even if API fails
        const basicCompanyData: CompanyData = {
          name: `${newSymbol} Corporation`,
          symbol: newSymbol,
          exchangeShortName: 'NASDAQ'
        };
        onCompanyChange(basicCompanyData);
        setIsEditing(false);
      }
    } else {
      setIsEditing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-lg border">
        <div className="animate-pulse flex items-center gap-2">
          <div className="h-4 bg-gray-200 rounded w-16"></div>
          <div className="h-3 bg-gray-200 rounded w-12"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-lg border">
        <span className="text-gray-500 text-sm">Price unavailable</span>
      </div>
    );
  }

  const isPositive = data.change > 0;
  const isNegative = data.change < 0;
  const isNeutral = data.change === 0;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const formatChange = (change: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      signDisplay: 'always',
    }).format(change);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  return (
    <div className="relative flex items-center gap-3 px-4 py-2 bg-white rounded-lg border">
      {isEditing ? (
        // Editing Mode
        <>
          <div className="relative">
            <Input
              value={editSymbol}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyPress}
              className="w-20 h-8 text-center font-semibold text-lg"
              placeholder="AAPL"
              autoFocus
              maxLength={5}
            />
            
            {/* Search Dropdown */}
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 min-w-64">
                {searchResults.map((company, index) => (
                  <button
                    key={`${company.symbol}-${index}`}
                    onClick={() => handleSelectCompany(company)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b last:border-b-0 flex items-center gap-2"
                  >
                    <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center text-xs font-bold text-blue-700">
                      {company.symbol}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{company.name}</div>
                      <div className="text-xs text-gray-600">{company.symbol} • {company.exchangeShortName || company.stockExchange}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <Button size="sm" variant="ghost" onClick={handleSaveEdit} className="h-8 w-8 p-0">
            <Check className="h-4 w-4 text-green-600" />
          </Button>
          <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="h-8 w-8 p-0">
            <X className="h-4 w-4 text-red-600" />
          </Button>
        </>
      ) : (
        // Display Mode
        <>
          {/* Clickable Stock Symbol */}
          <button
            onClick={handleStartEdit}
            className="font-semibold text-gray-900 text-lg hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors flex items-center gap-1"
            title="Click to change company"
          >
            {symbol}
            <Edit3 className="h-3 w-3 opacity-50" />
          </button>
          
          {/* Stock Price */}
          <span className="font-bold text-xl text-gray-900">
            {formatPrice(data.price)}
          </span>
          
          {/* Change and Percentage */}
          <div className="flex items-center gap-1">
            {isPositive && <TrendingUp className="h-4 w-4 text-green-600" />}
            {isNegative && <TrendingDown className="h-4 w-4 text-red-600" />}
            {isNeutral && <Minus className="h-4 w-4 text-gray-500" />}
            
            <span className={`font-medium text-sm ${
              isPositive ? 'text-green-600' : 
              isNegative ? 'text-red-600' : 
              'text-gray-500'
            }`}>
              {formatChange(data.change)}
            </span>
            
            <span className={`font-medium text-sm ${
              isPositive ? 'text-green-600' : 
              isNegative ? 'text-red-600' : 
              'text-gray-500'
            }`}>
              ({formatPercent(data.changePercent)})
            </span>
          </div>
        </>
      )}
    </div>
  );
};