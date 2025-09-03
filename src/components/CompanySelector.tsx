import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Building2 } from 'lucide-react';

interface CompanyData {
  name: string;
  symbol: string;
  exchangeShortName: string;
  currency?: string;
  stockExchange?: string;
}

interface CompanySelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onCompanySelect: (company: CompanyData) => void;
  currentCompany?: CompanyData | null;
}

export const CompanySelector = ({ isOpen, onClose, onCompanySelect, currentCompany }: CompanySelectorProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  console.log('CompanySelector rendered, isOpen:', isOpen);

  // Search function that mimics signup.js exactly
  const searchCompanies = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    // Use the same global API service as signup flow
    if (!(window as any).apiService) {
      console.error('API service not available');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Searching for:', query);
      const results = await (window as any).apiService.searchCompanies(query);
      console.log('Search results:', results);
      setSearchResults(results.slice(0, 8));
    } catch (error) {
      console.error('Error searching companies:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchCompanies(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleCompanySelect = (company: any) => {
    console.log('Company selected:', company);
    
    // Convert to our CompanyData format
    const companyData: CompanyData = {
      name: company.name,
      symbol: company.symbol,
      exchangeShortName: company.exchangeShortName || 'NASDAQ',
      currency: company.currency,
      stockExchange: company.stockExchange || company.exchange
    };
    
    onCompanySelect(companyData);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleClose = () => {
    console.log('CompanySelector closing');
    setSearchQuery('');
    setSearchResults([]);
    onClose();
  };

  // Debug when component opens/closes
  useEffect(() => {
    if (isOpen) {
      console.log('CompanySelector opened');
    } else {
      console.log('CompanySelector closed');
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Change Company
          </DialogTitle>
          <DialogDescription>
            Search for a company to switch your dashboard view
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Current Company Display */}
          {currentCompany && (
            <div className="p-3 bg-blue-50 rounded-lg border">
              <p className="text-sm text-gray-600 mb-1">Currently viewing:</p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center text-xs font-bold text-blue-700">
                  {currentCompany.symbol}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{currentCompany.name}</p>
                  <p className="text-xs text-gray-600">{currentCompany.symbol} • {currentCompany.exchangeShortName}</p>
                </div>
              </div>
            </div>
          )}

          {/* Search Input */}
          <div className="relative">
            <Input
              placeholder="Search for a company (e.g., Apple, Tesla, Microsoft)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>

          {/* Search Results */}
          <div className="max-h-96 overflow-auto">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-500">Searching companies...</div>
              </div>
            )}
            
            {!isLoading && searchQuery.length >= 2 && searchResults.length === 0 && (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-500">No companies found for "{searchQuery}"</div>
              </div>
            )}
            
            {!isLoading && searchResults.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm text-gray-600 mb-2">Found {searchResults.length} companies:</div>
                {searchResults.map((company, index) => {
                  console.log('Rendering company:', company);
                  return (
                  <button
                    key={`${company.symbol}-${index}`}
                    onClick={() => handleCompanySelect(company)}
                    className="w-full p-3 text-left hover:bg-gray-50 rounded-lg border transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                        <img
                          src={`https://financialmodelingprep.com/image-stock/${company.symbol}.png`}
                          alt={company.symbol}
                          className="w-8 h-8 rounded"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                        <div 
                          className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center text-xs font-bold text-blue-700"
                          style={{ display: 'none' }}
                        >
                          {company.symbol}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{company.name}</p>
                        <p className="text-sm text-gray-600">
                          {company.symbol} • {company.exchangeShortName || company.stockExchange}
                        </p>
                      </div>
                    </div>
                  </button>
                  );
                })}
              </div>
            )}
            
            {searchQuery.length < 2 && !isLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-500">Type at least 2 characters to search</div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};