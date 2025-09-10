import { Link, useLocation } from "react-router-dom";
import { Bell, Settings, Radar, Satellite } from "lucide-react";
import { cn } from "@/lib/utils";

const Navbar = () => {
  const location = useLocation();

  const navItems = [
    {
      path: "/",
      label: "Intelligence Hub",
      icon: Radar,
    },
    {
      path: "/alerts",
      label: "Active Threats",
      icon: Satellite,
    },
    {
      path: "/notifications",
      label: "Communications",
      icon: Bell,
    },
    {
      path: "/settings",
      label: "Configuration",
      icon: Settings,
    },
  ];

  return (
    <nav className="bg-gradient-to-r from-widget-primary to-widget-secondary border-b border-chart-1/20 p-4 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-chart-1 to-destructive rounded-lg flex items-center justify-center shadow-lg shadow-chart-1/20">
            <Satellite className="w-6 h-6 text-background" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-wider">TRIGGER BLACKBOX</h1>
            <p className="text-xs text-muted-foreground font-mono tracking-wide">Intelligence Operations Center</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 hover:scale-105 tracking-wide",
                  isActive
                    ? "bg-gradient-to-r from-chart-1 to-destructive text-background shadow-lg shadow-chart-1/25"
                    : "text-muted-foreground hover:text-foreground hover:bg-foreground/5 hover:shadow-md"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;