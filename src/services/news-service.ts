// News Service for BusinessOS
// Integrates with FMP API and filters news content

import { fmpApi, CompanyNews } from './fmp-api';

export interface ProcessedNewsItem {
  id: string;
  title: string;
  site: string;
  publishedDate: string;
  priority: "high" | "medium" | "low";
  category: "market" | "operational" | "contracts" | "capital" | "press_release";
  classification: "UNCLASSIFIED" | "CONFIDENTIAL" | "SECRET";
  url: string;
  text: string;
  image?: string;
  isFiltered: boolean;
  filterReason?: string;
}

export interface PressRelease {
  id: string;
  title: string;
  site: string;
  publishedDate: string;
  url: string;
  text: string;
  image?: string;
}

class NewsService {
  // Sites and content patterns to filter out (opinion pieces, low-quality sources)
  private readonly FILTERED_SITES = [
    'zacks.com',
    'barrons.com',
    'motleyfool.com',
    'seekingalpha.com',
    'investorplace.com',
    'fool.com',
    'marketwatch.com', // Often opinion-heavy
    'thestreet.com', // Often opinion-heavy
  ];

  private readonly OPINION_PATTERNS = [
    /\?/g, // Articles with question marks (often opinion/speculation)
    /why\s+/i,
    /what\s+/i,
    /should\s+you/i,
    /is\s+it\s+time/i,
    /buy\s+or\s+sell/i,
    /bull\s+or\s+bear/i,
    /bullish\s+or\s+bearish/i,
    /opinion/i,
    /analysis:/i,
    /recommendation/i,
    /rating/i,
    /price\s+target/i,
  ];

  // Only these sites can provide official press releases
  private readonly OFFICIAL_PRESS_RELEASE_SOURCES = [
    'businesswire.com',
    'prnewswire.com', 
    'globenewswire.com'
  ];

  // Priority order for press release sources (highest to lowest)
  private readonly PRESS_RELEASE_SOURCE_PRIORITY = {
    'businesswire.com': 1,
    'prnewswire.com': 2,
    'globenewswire.com': 3
  };

  // Removed PRESS_RELEASE_INDICATORS - all wire service articles are automatically press releases

  private readonly HIGH_PRIORITY_KEYWORDS = [
    'earnings',
    'merger',
    'acquisition',
    'bankruptcy',
    'lawsuit',
    'sec',
    'fda',
    'approval',
    'contract',
    'partnership',
    'clinical trial',
    'breakthrough',
  ];

  private readonly CAPITAL_ACTION_KEYWORDS = [
    'dividend',
    'stock split',
    'buyback',
    'share repurchase',
    'ipo',
    'offering',
    'capital raise',
    'debt',
    'financing',
  ];

  private readonly OPERATIONAL_KEYWORDS = [
    'production',
    'manufacturing',
    'facility',
    'plant',
    'operations',
    'supply chain',
    'delivery',
    'launch',
    'product',
  ];

  private readonly CONTRACT_KEYWORDS = [
    'contract',
    'agreement',
    'deal',
    'partnership',
    'collaboration',
    'government',
    'defense',
    'military',
    'nasa',
    'dod',
  ];

  private isFiltered(newsItem: CompanyNews): { filtered: boolean; reason?: string } {
    // Check site filtering
    const siteLower = newsItem.site.toLowerCase();
    for (const filteredSite of this.FILTERED_SITES) {
      if (siteLower.includes(filteredSite)) {
        return { filtered: true, reason: `Opinion source: ${newsItem.site}` };
      }
    }

    // Check title for opinion patterns
    const titleLower = newsItem.title.toLowerCase();
    for (const pattern of this.OPINION_PATTERNS) {
      if (pattern.test(newsItem.title)) {
        return { filtered: true, reason: `Opinion pattern detected: ${pattern.source}` };
      }
    }

    return { filtered: false };
  }

  private categorizePriority(newsItem: CompanyNews): "high" | "medium" | "low" {
    const titleLower = newsItem.title.toLowerCase();
    
    for (const keyword of this.HIGH_PRIORITY_KEYWORDS) {
      if (titleLower.includes(keyword)) {
        return "high";
      }
    }

    // Check if it's from a major financial site (usually more reliable)
    const majorSites = ['reuters.com', 'bloomberg.com', 'cnbc.com', 'sec.gov', 'businesswire.com', 'prnewswire.com'];
    if (majorSites.some(site => newsItem.site.toLowerCase().includes(site))) {
      return "medium";
    }

    return "low";
  }

  private categorizeType(newsItem: CompanyNews): "market" | "operational" | "contracts" | "capital" | "press_release" {
    const titleLower = newsItem.title.toLowerCase();
    const textLower = newsItem.text.toLowerCase();
    const siteLower = newsItem.site.toLowerCase();
    
    // Any article from official wire services is automatically a press release
    const isOfficialSource = this.OFFICIAL_PRESS_RELEASE_SOURCES.some(source => 
      siteLower.includes(source)
    );
    
    if (isOfficialSource) {
      return "press_release";
    }

    // Check for capital actions
    for (const keyword of this.CAPITAL_ACTION_KEYWORDS) {
      if (titleLower.includes(keyword)) {
        return "capital";
      }
    }

    // Check for contracts
    for (const keyword of this.CONTRACT_KEYWORDS) {
      if (titleLower.includes(keyword)) {
        return "contracts";
      }
    }

    // Check for operational news
    for (const keyword of this.OPERATIONAL_KEYWORDS) {
      if (titleLower.includes(keyword)) {
        return "operational";
      }
    }

    return "market";
  }

  private processNewsItem(newsItem: CompanyNews, index: number): ProcessedNewsItem {
    const filterResult = this.isFiltered(newsItem);
    
    return {
      id: `news-${Date.now()}-${index}`,
      title: newsItem.title,
      site: newsItem.site,
      publishedDate: newsItem.publishedDate.split(' ')[0], // Extract date part
      priority: this.categorizePriority(newsItem),
      category: this.categorizeType(newsItem),
      classification: "UNCLASSIFIED",
      url: newsItem.url,
      text: newsItem.text,
      image: newsItem.image,
      isFiltered: filterResult.filtered,
      filterReason: filterResult.reason,
    };
  }

  async getCompanyNews(symbol: string, limit: number = 50, fromDate?: string, toDate?: string): Promise<ProcessedNewsItem[]> {
    try {
      console.log(`🗞️ [NEWS-SERVICE] Fetching news for ${symbol}${fromDate ? ` from ${fromDate} to ${toDate}` : ''}...`);
      const rawNews = await fmpApi.getCompanyNews(symbol, limit, fromDate, toDate);
      
      console.log(`🗞️ [NEWS-SERVICE] Raw API response:`, rawNews);
      console.log(`🗞️ [NEWS-SERVICE] Response type:`, typeof rawNews);
      console.log(`🗞️ [NEWS-SERVICE] Is array:`, Array.isArray(rawNews));
      
      if (!Array.isArray(rawNews)) {
        console.error('🚨 [NEWS-SERVICE] Invalid news response format:', rawNews);
        return [];
      }

      // Process and filter news
      const processedNews = rawNews.map((item, index) => this.processNewsItem(item, index));
      
      // Filter out unwanted content
      const filteredNews = processedNews.filter(item => !item.isFiltered);
      
      console.log(`📰 Processed ${rawNews.length} raw articles, ${filteredNews.length} after filtering`);
      
      // Sort by date (newest first) and priority
      return filteredNews.sort((a, b) => {
        // First sort by date
        const dateA = new Date(a.publishedDate).getTime();
        const dateB = new Date(b.publishedDate).getTime();
        if (dateB !== dateA) {
          return dateB - dateA;
        }
        
        // Then by priority
        const priorityWeight = { high: 3, medium: 2, low: 1 };
        return priorityWeight[b.priority] - priorityWeight[a.priority];
      });

    } catch (error) {
      console.error('💥 Error fetching company news:', error);
      return [];
    }
  }

  async getPressReleases(symbol: string, limit: number = 20, fromDate?: string, toDate?: string): Promise<PressRelease[]> {
    try {
      const allNews = await this.getCompanyNews(symbol, limit * 3, fromDate, toDate); // Get more to filter for press releases
      
      console.log(`🔍 [PRESS-RELEASES] Processing ${allNews.length} total news items for ${symbol}`);
      
      // Debug: Check all sources in the news
      const allSources = [...new Set(allNews.map(item => item.site))];
      console.log(`🔍 [PRESS-RELEASES] All news sources found:`, allSources);
      
      // Debug: Check items from official sources
      const officialSourceItems = allNews.filter(item => {
        const siteLower = item.site.toLowerCase();
        return this.OFFICIAL_PRESS_RELEASE_SOURCES.some(source => siteLower.includes(source));
      });
      console.log(`🔍 [PRESS-RELEASES] Items from official sources (${this.OFFICIAL_PRESS_RELEASE_SOURCES.join(', ')}):`, officialSourceItems.length);
      
      if (officialSourceItems.length > 0) {
        console.log(`🔍 [PRESS-RELEASES] Sample official source items:`, officialSourceItems.slice(0, 3).map(item => ({
          title: item.title,
          site: item.site,
          category: item.category
        })));
      }
      
      // Filter for press releases from official sources only
      let pressReleases = allNews
        .filter(item => item.category === 'press_release')
        .map(item => ({
          id: item.id,
          title: item.title,
          site: item.site,
          publishedDate: item.publishedDate,
          url: item.url,
          text: item.text,
          image: item.image,
          priority: this.getPressReleaseSourcePriority(item.site)
        }));

      console.log(`🔍 [PRESS-RELEASES] Items classified as press_release: ${pressReleases.length}`);
      if (pressReleases.length > 0) {
        console.log(`🔍 [PRESS-RELEASES] Press releases found:`, pressReleases.map(pr => ({
          title: pr.title,
          site: pr.site,
          priority: pr.priority
        })));
      }

      // Remove duplicates - prioritize Business Wire if same content
      const deduplicatedReleases = this.deduplicatePressReleases(pressReleases);
      console.log(`🔍 [PRESS-RELEASES] After deduplication: ${deduplicatedReleases.length} releases`);
      
      // Sort by priority (Business Wire first) then by date
      const sortedReleases = deduplicatedReleases
        .sort((a, b) => {
          // First sort by date (newer first)
          const dateA = new Date(a.publishedDate).getTime();
          const dateB = new Date(b.publishedDate).getTime();
          if (dateB !== dateA) {
            return dateB - dateA;
          }
          // Then by source priority (Business Wire first)
          return a.priority - b.priority;
        })
        // Remove limit to show all press releases found
        .map(({ priority, ...release }) => release); // Remove priority field from final result

      console.log(`📢 [PRESS-RELEASES] Final result: ${sortedReleases.length} press releases for ${symbol} from official sources`);
      return sortedReleases;

    } catch (error) {
      console.error('💥 Error fetching press releases:', error);
      return [];
    }
  }

  private getPressReleaseSourcePriority(site: string): number {
    const siteLower = site.toLowerCase();
    for (const [source, priority] of Object.entries(this.PRESS_RELEASE_SOURCE_PRIORITY)) {
      if (siteLower.includes(source)) {
        return priority;
      }
    }
    return 999; // Lowest priority for unknown sources
  }

  private deduplicatePressReleases(releases: (PressRelease & { priority: number })[]): (PressRelease & { priority: number })[] {
    const titleMap = new Map<string, PressRelease & { priority: number }>();
    
    for (const release of releases) {
      // Normalize title for comparison (remove common variations)
      const normalizedTitle = release.title
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s]/g, '')
        .trim();
      
      const existing = titleMap.get(normalizedTitle);
      if (!existing || release.priority < existing.priority) {
        // Keep this one (new or higher priority source)
        titleMap.set(normalizedTitle, release);
      }
    }
    
    return Array.from(titleMap.values());
  }

  async getGeneralMarketNews(limit: number = 30): Promise<ProcessedNewsItem[]> {
    try {
      console.log('📈 Fetching general market news...');
      const rawNews = await fmpApi.getGeneralNews(limit);
      
      if (!Array.isArray(rawNews)) {
        console.error('Invalid general news response format:', rawNews);
        return [];
      }

      // Process and filter news
      const processedNews = rawNews.map((item, index) => this.processNewsItem(item, index));
      
      // Filter out unwanted content
      const filteredNews = processedNews.filter(item => !item.isFiltered);
      
      console.log(`📰 Processed ${rawNews.length} general articles, ${filteredNews.length} after filtering`);
      
      return filteredNews.sort((a, b) => {
        const dateA = new Date(a.publishedDate).getTime();
        const dateB = new Date(b.publishedDate).getTime();
        return dateB - dateA;
      });

    } catch (error) {
      console.error('💥 Error fetching general market news:', error);
      return [];
    }
  }
}

export const newsService = new NewsService();