import { CategoryType, CategoryInfo } from '../types/event';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface CategoryFiltersProps {
  selectedCategories: CategoryType[];
  onCategoriesChange: (categories: CategoryType[]) => void;
}

const categoryInfo: CategoryInfo[] = [
  { type: 'insider', label: 'Insiders', description: 'Executive transactions', color: 'category-insider' },
  { type: 'institutional', label: 'Institutional', description: 'Large holders & activists', color: 'category-institutional' },
  { type: 'analyst', label: 'Analysts', description: 'Research & ratings', color: 'category-analyst' },
  { type: 'regulatory', label: 'Regulatory', description: 'Government & compliance', color: 'category-regulatory' },
  { type: 'news_pr', label: 'News/PR', description: 'Press releases & news', color: 'category-media' },
  { type: 'media_appearance', label: 'Media Appearances', description: 'Executive interviews & quotes', color: 'category-influencer' },
  { type: 'competitor', label: 'Competitors', description: 'Peer activities', color: 'category-competitor' },
  { type: 'customer', label: 'Customers', description: 'Partnerships & deals', color: 'category-customer' },
  { type: 'short_interest', label: 'Short Interest', description: 'Short selling activity', color: 'category-short' },
  { type: 'etf', label: 'Index/ETF', description: 'Fund flows', color: 'category-etf' },
];

export function CategoryFilters({ selectedCategories, onCategoriesChange }: CategoryFiltersProps) {
  const toggleCategory = (category: CategoryType) => {
    if (selectedCategories.includes(category)) {
      onCategoriesChange(selectedCategories.filter(c => c !== category));
    } else {
      onCategoriesChange([...selectedCategories, category]);
    }
  };

  const clearAll = () => {
    onCategoriesChange([]);
  };

  return (
    <div className="bg-surface-elevated rounded-lg border border-border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Categories</h3>
        {selectedCategories.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs">
            Clear All
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {categoryInfo.map((category) => {
          const isSelected = selectedCategories.includes(category.type);
          return (
            <button
              key={category.type}
              onClick={() => toggleCategory(category.type)}
              className={`w-full text-left p-3 rounded-md border transition-all ${
                isSelected
                  ? 'border-primary bg-primary/10 shadow-sm'
                  : 'border-border hover:border-border/60 hover:bg-surface/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div 
                      className={`w-3 h-3 rounded-full`}
                      style={{ backgroundColor: `hsl(var(--${category.color}))` }}
                    />
                    <span className="font-medium text-sm text-foreground">
                      {category.label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {category.description}
                  </p>
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
  );
}