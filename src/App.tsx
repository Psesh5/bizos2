import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Dashboard } from "./components/Dashboard";
import { useEffect, useState } from "react";
import "./styles/price-move-radar.css";

const queryClient = new QueryClient();

const App = () => {
  const [companySymbol, setCompanySymbol] = useState<string>("AAPL");

  useEffect(() => {
    // Read stored company data from signup flow
    const storedTicker = localStorage.getItem('companyTicker');
    if (storedTicker) {
      setCompanySymbol(storedTicker);
      console.log('Using selected company symbol:', storedTicker);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Dashboard companySymbol={companySymbol} />
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
