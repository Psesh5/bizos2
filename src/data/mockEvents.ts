import { Event } from '../types/event';

export const mockEvents: Event[] = [
  {
    id: '1',
    ticker: 'AAPL',
    category: 'insider',
    title: 'CEO Tim Cook Sells 223,986 Shares',
    summary: 'Apple CEO disposed of shares worth approximately $41.5M in pre-planned transaction',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    impact: 'medium',
    confidence: 'high',
    source: 'SEC Form 4',
    sourceUrl: '#',
    explanation: 'Routine insider selling by CEOs is typically planned months in advance and may not indicate negative sentiment. However, large volumes can create short-term selling pressure.',
    watchPhrases: ['insider selling', 'CEO transaction', 'stock disposal']
  },
  {
    id: '2',
    ticker: 'TSLA',
    category: 'analyst',
    title: 'Goldman Sachs Upgrades to Buy, PT $350',
    summary: 'Analyst cites strong Model Y demand and improved production efficiency in China',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    impact: 'high',
    confidence: 'high',
    source: 'Goldman Sachs Research',
    sourceUrl: '#',
    explanation: 'Analyst upgrades from major investment banks often trigger institutional buying and can provide 3-5% short-term price momentum.',
    watchPhrases: ['upgrade', 'price target increase', 'buy rating']
  },
  {
    id: '3',
    ticker: 'NVDA',
    category: 'regulatory',
    title: 'China Export License Approved for AI Chips',
    summary: 'Commerce Department grants special license for modified H100 chips to Chinese customers',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    impact: 'high',
    confidence: 'medium',
    source: 'Reuters',
    sourceUrl: '#',
    explanation: 'Regulatory approvals in key markets can significantly impact revenue projections, especially for companies with substantial international exposure.',
    watchPhrases: ['export license', 'China approval', 'regulatory clearance']
  },
  {
    id: '4',
    ticker: 'META',
    category: 'institutional',
    title: 'Berkshire Hathaway Initiates $2.1B Position',
    summary: 'Warren Buffett\'s conglomerate disclosed new stake representing 1.2% of outstanding shares',
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    impact: 'high',
    confidence: 'high',
    source: '13F Filing',
    sourceUrl: '#',
    explanation: 'High-profile investor entries, especially Berkshire Hathaway, often signal strong fundamental conviction and can attract other institutional buyers.',
    watchPhrases: ['Berkshire Hathaway', 'new position', 'institutional buying']
  },
  {
    id: '5',
    ticker: 'AMZN',
    category: 'news_pr',
    title: 'WSJ: AWS Wins $15B Government Cloud Contract',
    summary: 'Amazon Web Services selected for multi-year federal modernization initiative',
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    impact: 'medium',
    confidence: 'medium',
    source: 'Wall Street Journal',
    sourceUrl: '#',
    explanation: 'Large government contracts provide stable, long-term revenue streams and often validate competitive positioning in enterprise markets.',
    watchPhrases: ['government contract', 'AWS win', 'cloud deal']
  },
  {
    id: '5b',
    ticker: 'NVDA',
    category: 'media_appearance',
    title: 'Jensen Huang on CNBC: "AI Demand Still in Early Innings"',
    summary: 'NVIDIA CEO discusses data center growth and next-gen chip roadmap in live interview',
    timestamp: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(),
    impact: 'high',
    confidence: 'high',
    source: 'CNBC Squawk Box',
    sourceUrl: '#',
    explanation: 'CEO commentary on core business trends can significantly influence investor sentiment and provide forward guidance insights.',
    watchPhrases: ['CEO interview', 'demand outlook', 'guidance'],
    quotes: [
      {
        text: "We're still in the early innings of the AI revolution. Enterprise demand for our data center solutions continues to exceed our ability to supply.",
        speaker: 'Jensen Huang',
        title: 'CEO, NVIDIA',
        context: 'Discussing Q4 outlook',
        mediaType: 'TV',
        mediaLink: '#'
      },
      {
        text: "The next generation of AI chips will deliver 10x performance improvements. We're not just keeping up with demand - we're defining what's possible.",
        speaker: 'Jensen Huang',
        title: 'CEO, NVIDIA',
        context: 'On competitive positioning',
        mediaType: 'TV',
        mediaLink: '#'
      }
    ]
  },
  {
    id: '6',
    ticker: 'MSFT',
    category: 'competitor',
    title: 'Google Announces Competing AI Office Suite',
    summary: 'Workspace integration with Bard threatens Microsoft 365 Copilot adoption',
    timestamp: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
    impact: 'medium',
    confidence: 'medium',
    source: 'TechCrunch',
    sourceUrl: '#',
    explanation: 'Direct competitive threats in core product categories can impact market share assumptions and pricing power.',
    watchPhrases: ['competitive threat', 'Google Workspace', 'AI integration']
  },
  {
    id: '6b',
    ticker: 'TSLA',
    category: 'media_appearance',
    title: 'Elon Musk on Bloomberg: "FSD Beta Rollout Accelerating"',
    summary: 'Tesla CEO provides update on autonomous driving progress and timeline',
    timestamp: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
    impact: 'high',
    confidence: 'medium',
    source: 'Bloomberg Technology',
    sourceUrl: '#',
    explanation: 'Autonomous driving updates are critical for Tesla\'s valuation multiple and competitive moat in the EV space.',
    watchPhrases: ['FSD update', 'autonomous driving', 'Musk interview'],
    quotes: [
      {
        text: "We're seeing remarkable progress with FSD Beta. I'm confident we'll achieve unsupervised driving this year.",
        speaker: 'Elon Musk',
        title: 'CEO, Tesla',
        context: 'On autonomous driving timeline',
        mediaType: 'TV',
        mediaLink: '#'
      }
    ]
  },
  {
    id: '7',
    ticker: 'GOOGL',
    category: 'short_interest',
    title: 'Short Interest Increases 15% Week-over-Week',
    summary: 'Hedge funds increase bearish bets amid antitrust concerns and AI competition',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    impact: 'low',
    confidence: 'high',
    source: 'S3 Partners',
    sourceUrl: '#',
    explanation: 'Rising short interest can create downward pressure and indicates growing bearish sentiment among sophisticated investors.',
    watchPhrases: ['short interest', 'hedge fund positioning', 'bearish sentiment']
  },
  {
    id: '8',
    ticker: 'NFLX',
    category: 'customer',
    title: 'Comcast Partnership Expands to 50M Households',
    summary: 'Netflix to be bundled with Xfinity packages, potential for 8M new subscribers',
    timestamp: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
    impact: 'medium',
    confidence: 'high',
    source: 'Company Press Release',
    sourceUrl: '#',
    explanation: 'Distribution partnerships can significantly accelerate subscriber growth and reduce customer acquisition costs.',
    watchPhrases: ['partnership expansion', 'subscriber growth', 'distribution deal']
  }
];