// FMP API Service for Signup Flow (Vanilla JavaScript)
class APIService {
    constructor() {
        this.baseUrl = 'https://financialmodelingprep.com/api/v3';
        this.apiKey = 'QLmCqVKpw5uZHM6sFs69VSSDDlU3xiPy';
        this.tradingList = null; // Cache for actively trading companies
        this.initializeTradingList();
    }

    async initializeTradingList() {
        try {
            console.log('Fetching actively trading companies list...');
            const url = `${this.baseUrl}/available-traded/list?apikey=${this.apiKey}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (Array.isArray(data)) {
                // Create a Set for fast lookup and filter for major exchanges
                this.tradingList = new Set(
                    data
                        .filter(company => 
                            company.exchangeShortName && 
                            ['NASDAQ', 'NYSE', 'AMEX'].includes(company.exchangeShortName) &&
                            company.symbol && 
                            company.symbol.length <= 5 && // Filter out overly long symbols
                            !/[^A-Z]/.test(company.symbol) // Only allow pure alphabetic symbols
                        )
                        .map(company => company.symbol)
                );
                console.log(`✅ Loaded ${this.tradingList.size} actively trading companies`);
            }
        } catch (error) {
            console.error('Failed to load trading list:', error);
            // Fallback to empty set
            this.tradingList = new Set();
        }
    }

    async searchCompanies(query) {
        if (!query || query.length < 2) return [];
        
        // Wait for trading list to be loaded if it's still loading
        if (this.tradingList === null) {
            console.log('Waiting for trading list to load...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            if (this.tradingList === null) {
                console.warn('Trading list not loaded, proceeding without filter');
            }
        }
        
        try {
            const url = `${this.baseUrl}/search?query=${encodeURIComponent(query)}&limit=50&exchange=NASDAQ,NYSE,AMEX&apikey=${this.apiKey}`;
            console.log('Searching companies with URL:', url);
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Check for FMP API errors
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Return empty array if no results
            if (!Array.isArray(data) || data.length === 0) {
                return [];
            }
            
            const queryUpper = query.toUpperCase();
            
            // Filter and rank results
            const filtered = data
                .filter(company => {
                    // Must have a symbol
                    if (!company.symbol) return false;
                    
                    // Filter out invalid symbols (numbers, special chars, too long)
                    if (company.symbol.length > 5 || !/^[A-Z]+$/.test(company.symbol)) return false;
                    
                    // If we have the trading list, only include actively trading companies
                    if (this.tradingList && this.tradingList.size > 0) {
                        if (!this.tradingList.has(company.symbol)) return false;
                    }
                    
                    // Must have a reasonable company name
                    if (!company.name || company.name.length < 3) return false;
                    
                    // Filter major exchanges only
                    const validExchanges = ['NASDAQ', 'NYSE', 'AMEX'];
                    if (!validExchanges.includes(company.exchangeShortName)) return false;
                    
                    return true;
                })
                .map(company => ({
                    symbol: company.symbol,
                    name: company.name,
                    currency: company.currency || 'USD',
                    stockExchange: company.stockExchange || company.exchange,
                    exchangeShortName: company.exchangeShortName,
                    // Add search relevance score
                    relevance: this.calculateRelevance(company, queryUpper)
                }))
                .sort((a, b) => b.relevance - a.relevance) // Sort by relevance
                .slice(0, 15); // Limit results
            
            console.log(`Found ${filtered.length} valid companies for "${query}"`);
            return filtered;
            
        } catch (error) {
            console.error('Error searching companies:', error);
            throw error;
        }
    }

    calculateRelevance(company, queryUpper) {
        const symbol = company.symbol;
        const name = company.name.toUpperCase();
        
        // Exact symbol match gets highest score
        if (symbol === queryUpper) return 100;
        
        // Symbol starts with query gets high score
        if (symbol.startsWith(queryUpper)) return 80;
        
        // Company name starts with query gets good score
        if (name.startsWith(queryUpper)) return 60;
        
        // Symbol contains query gets medium score
        if (symbol.includes(queryUpper)) return 40;
        
        // Company name contains query gets lower score
        if (name.includes(queryUpper)) return 20;
        
        // Default low score
        return 1;
    }

    async getCompanyProfile(symbol) {
        try {
            const url = `${this.baseUrl}/profile/${symbol}?apikey=${this.apiKey}`;
            console.log('Getting company profile with URL:', url);
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Check for FMP API errors
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Return the first result (profiles come as arrays)
            return Array.isArray(data) ? data[0] : data;
            
        } catch (error) {
            console.error('Error getting company profile:', error);
            throw error;
        }
    }

    async getCompanyQuote(symbol) {
        try {
            const url = `${this.baseUrl}/quote/${symbol}?apikey=${this.apiKey}`;
            console.log('Getting company quote with URL:', url);
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Check for FMP API errors
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Return the first result (quotes come as arrays)
            return Array.isArray(data) ? data[0] : data;
            
        } catch (error) {
            console.error('Error getting company quote:', error);
            throw error;
        }
    }
}

// Initialize the API service and make it globally available
window.apiService = new APIService();
console.log('✅ API Service initialized for signup flow');

// Test the API service with a simple search
window.apiService.searchCompanies('AAPL').then(results => {
    console.log('✅ Test API call successful, results:', results);
}).catch(error => {
    console.error('❌ Test API call failed:', error);
});