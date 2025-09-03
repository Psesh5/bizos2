import { useState, useCallback } from 'react';
import { BaseWidget } from '@/types/widget';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { WidgetLibrary } from './WidgetLibrary';
import { WidgetContainer } from './WidgetContainer';

export const BasicDashboard = () => {
  const [widgets, setWidgets] = useState<BaseWidget[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [nextId, setNextId] = useState(1);

  const addWidget = useCallback((type: string, title: string) => {
    const newWidget: BaseWidget = {
      id: `widget-${nextId}`,
      type,
      title,
      position: {
        x: (widgets.length % 3) * 4,
        y: Math.floor(widgets.length / 3) * 4,
        w: 4,
        h: 4,
      },
      config: { symbol: 'AAPL' }, // Hardcode AAPL for now
    };

    setWidgets(prev => [...prev, newWidget]);
    setNextId(prev => prev + 1);
    setShowLibrary(false);
  }, [widgets.length, nextId]);

  const updateWidget = useCallback((id: string, config: Record<string, any>) => {
    setWidgets(prev => 
      prev.map(widget => 
        widget.id === id 
          ? { ...widget, config: { ...widget.config, ...config } }
          : widget
      )
    );
  }, []);

  const removeWidget = useCallback((id: string) => {
    setWidgets(prev => prev.filter(widget => widget.id !== id));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Business<span className="text-blue-600">OS</span>
          </h1>
          <p className="text-gray-600 mt-1">Dashboard for AAPL</p>
        </div>
        <Button 
          onClick={() => setShowLibrary(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Widget
        </Button>
      </div>

      {/* Welcome State */}
      {widgets.length === 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🎯</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to BusinessOS
          </h2>
          <p className="text-gray-600 mb-6">
            Start building your AAPL dashboard
          </p>
          <Button onClick={() => setShowLibrary(true)} size="lg">
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Widget
          </Button>
        </div>
      )}

      {/* Widget Grid */}
      {widgets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {widgets.map((widget) => (
            <div
              key={widget.id}
              className="min-h-[300px]"
            >
              <WidgetContainer
                widget={widget}
                onUpdate={(config) => updateWidget(widget.id, config)}
                onRemove={() => removeWidget(widget.id)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Widget Library Modal */}
      <WidgetLibrary
        isOpen={showLibrary}
        onClose={() => setShowLibrary(false)}
        onAddWidget={addWidget}
      />
    </div>
  );
};