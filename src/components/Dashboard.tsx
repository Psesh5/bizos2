import { useState, useCallback, useEffect } from 'react';
import { BaseWidget } from '@/types/widget';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { WidgetLibrary } from './WidgetLibrary';
import { WidgetContainer } from './WidgetContainer';
import { CompanySelector } from './CompanySelector';
import { HeaderStockPrice } from './HeaderStockPrice';

interface DashboardProps {
  companySymbol?: string;
}

interface CompanyData {
  name: string;
  symbol: string;
  exchangeShortName: string;
}

export const Dashboard = ({ companySymbol }: DashboardProps) => {
  const [widgets, setWidgets] = useState<BaseWidget[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showCompanySelector, setShowCompanySelector] = useState(false);
  const [nextId, setNextId] = useState(1);
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [currentSymbol, setCurrentSymbol] = useState<string>(companySymbol || 'AAPL');
  const [expandedWidgets, setExpandedWidgets] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Try to get company data from localStorage
    const storedCompanyData = localStorage.getItem('selectedCompany');
    const storedTicker = localStorage.getItem('companyTicker');
    
    if (storedCompanyData) {
      try {
        const company = JSON.parse(storedCompanyData);
        setCompanyData(company);
      } catch (error) {
        console.error('Error parsing stored company data:', error);
      }
    }
    
    if (storedTicker) {
      setCurrentSymbol(storedTicker);
    }
  }, []);

  const handleCompanyChange = useCallback((company: CompanyData) => {
    console.log('Company changed to:', company);
    setCompanyData(company);
    setCurrentSymbol(company.symbol);
    
    // Update localStorage
    localStorage.setItem('selectedCompany', JSON.stringify(company));
    localStorage.setItem('companyTicker', company.symbol);
    
    // Update all widgets to use new company symbol
    console.log('🔄 Updating', widgets.length, 'widgets to symbol:', company.symbol);
    setWidgets(prev => prev.map(widget => {
      const updatedWidget = {
        ...widget,
        config: { ...widget.config, symbol: company.symbol }
      };
      console.log('🔄 Updated widget:', widget.id, 'from', widget.config?.symbol, 'to', company.symbol);
      return updatedWidget;
    }));
    
    setShowCompanySelector(false);
  }, []);

  const addWidget = useCallback((type: string, title: string) => {
    console.log('🔧 Adding widget with current symbol:', currentSymbol);
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
      config: currentSymbol ? { symbol: currentSymbol } : {},
    };
    console.log('🔧 New widget config:', newWidget.config);

    setWidgets(prev => [...prev, newWidget]);
    setNextId(prev => prev + 1);
    setShowLibrary(false);
  }, [widgets.length, nextId, currentSymbol]);

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
    setExpandedWidgets(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  }, []);

  const toggleWidgetExpanded = useCallback((id: string) => {
    setExpandedWidgets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Business<span className="text-blue-600">OS</span>
          </h1>
          {(companyData || currentSymbol) && (
            <p className="text-gray-600 mt-1">
              Dashboard for {companyData ? `${companyData.name}` : `${currentSymbol} Corporation`}
            </p>
          )}
        </div>
        
        {/* Stock Price Display with Editing */}
        {currentSymbol && (
          <HeaderStockPrice 
            symbol={currentSymbol} 
            onCompanyChange={handleCompanyChange}
          />
        )}
        
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
            {companyData 
              ? `Start building your ${companyData.name} dashboard` 
              : currentSymbol
                ? `Start building your ${currentSymbol} dashboard`
                : 'Select a company and start adding widgets'
            }
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
          {widgets.map((widget) => {
            const isExpanded = expandedWidgets.has(widget.id);
            return (
              <div
                key={widget.id}
                className={`transition-all duration-300 ${
                  isExpanded 
                    ? 'col-span-full row-span-2 min-h-[600px] z-10' 
                    : 'min-h-[300px]'
                }`}
              >
                <WidgetContainer
                  widget={widget}
                  onUpdate={(config) => updateWidget(widget.id, config)}
                  onRemove={() => removeWidget(widget.id)}
                  isExpanded={isExpanded}
                  onToggleExpanded={() => toggleWidgetExpanded(widget.id)}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Widget Library Modal */}
      <WidgetLibrary
        isOpen={showLibrary}
        onClose={() => setShowLibrary(false)}
        onAddWidget={addWidget}
      />

      {/* Company Selector Modal */}
      <CompanySelector
        isOpen={showCompanySelector}
        onClose={() => setShowCompanySelector(false)}
        onCompanySelect={handleCompanyChange}
        currentCompany={companyData}
      />
    </div>
  );
};