import { useState, useMemo } from 'react';
import { SearchBar } from './SearchBar';
import { CategoryFilters } from './CategoryFilters';
import { TimeFilters } from './TimeFilters';
import { EventFeed } from './EventFeed';
import { EventDetail } from './EventDetail';
import { mockEvents } from '../data/mockEvents';
import { Event, CategoryType, TimeFilter, ConfidenceLevel } from '../types/event';

export function PriceMoverRadar() {
  const [selectedTicker, setSelectedTicker] = useState<string>('');
  const [selectedCategories, setSelectedCategories] = useState<CategoryType[]>([]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('24h');
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceLevel[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredEvents = useMemo(() => {
    return mockEvents.filter(event => {
      // Filter by ticker
      if (selectedTicker && event.ticker !== selectedTicker) return false;
      
      // Filter by categories
      if (selectedCategories.length > 0 && !selectedCategories.includes(event.category)) return false;
      
      // Filter by confidence
      if (confidenceFilter.length > 0 && !confidenceFilter.includes(event.confidence)) return false;
      
      // Filter by search query
      if (searchQuery && !event.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !event.summary.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      
      // Filter by time (simplified for demo)
      return true;
    });
  }, [selectedTicker, selectedCategories, confidenceFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-surface">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-foreground">Price-Mover Radar</h1>
              <div className="text-sm text-muted-foreground">
                Real-time market intelligence
              </div>
            </div>
            
            <SearchBar
              value={selectedTicker}
              onChange={setSelectedTicker}
              onSearchQueryChange={setSearchQuery}
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <CategoryFilters
              selectedCategories={selectedCategories}
              onCategoriesChange={setSelectedCategories}
            />
            
            <TimeFilters
              selectedTime={timeFilter}
              onTimeChange={setTimeFilter}
              selectedConfidence={confidenceFilter}
              onConfidenceChange={setConfidenceFilter}
            />
          </div>

          <div className="lg:col-span-2">
            <EventFeed
              events={filteredEvents}
              onEventSelect={setSelectedEvent}
              selectedEvent={selectedEvent}
            />
          </div>

          <div className="lg:col-span-1">
            {selectedEvent && (
              <EventDetail
                event={selectedEvent}
                onClose={() => setSelectedEvent(null)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}