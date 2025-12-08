import { useState, useEffect, useCallback } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { 
  Home, Wrench, Users, Settings, Package, ShoppingBag, CreditCard, Smartphone,
  Menu, X, ChevronDown, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AuthButton } from "@/components/AuthButton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const MOBILE_BREAKPOINT = 768;

export default function AdminLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [isMobile, setIsMobile] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      return mobile;
    };
    
    const mobile = checkMobile();
    if (!mobile) {
      setSidebarOpen(true);
    }
    
    setIsInitialized(true);
    
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (isInitialized && isMobile) {
      setSidebarOpen(false);
    }
  }, [location.pathname, isMobile, isInitialized]);

  const navSections = [
    {
      title: "Overview",
      items: [
        { path: "/admin", label: "Dashboard", icon: Home },
      ]
    },
    {
      title: "Sales & Orders",
      items: [
        { path: "/admin/orders", label: "Orders", icon: ShoppingBag },
        { path: "/admin/payments", label: "Payments", icon: CreditCard },
      ]
    },
    {
      title: "Inventory",
      items: [
        { path: "/admin/products", label: "Products", icon: Package },
        { path: "/admin/spare-parts", label: "Spare Parts", icon: Smartphone },
        { path: "/admin/spare-parts-config", label: "Parts Config", icon: Settings },
        { path: "/admin/shop-inventory", label: "Shop Inventory", icon: ShoppingBag },
      ]
    },
    {
      title: "Services",
      items: [
        { path: "/admin/repairs", label: "Repairs", icon: Wrench },
        { path: "/admin/technicians", label: "Technicians", icon: Users },
      ]
    },
    {
      title: "Configuration",
      items: [
        { path: "/admin/settings", label: "Settings", icon: Settings },
      ]
    }
  ];

  const toggleSection = useCallback((title: string) => {
    setOpenSections(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  }, []);

  const isSectionActive = useCallback((items: typeof navSections[0]['items']) => {
    return items.some(item => 
      item.path === "/admin"
        ? location.pathname === "/admin"
        : location.pathname.startsWith(item.path)
    );
  }, [location.pathname]);

  useEffect(() => {
    if (!isInitialized) return;
    
    const initialOpen: Record<string, boolean> = {};
    navSections.forEach(section => {
      if (!isMobile && isSectionActive(section.items)) {
        initialOpen[section.title] = true;
      }
    });
    setOpenSections(initialOpen);
  }, [isInitialized, isMobile]);

  const NavContent = () => (
    <nav className="space-y-1">
      {navSections.map((section) => {
        const isOpen = openSections[section.title] ?? false;
        const hasActiveItem = isSectionActive(section.items);
        const itemCount = section.items.length;

        return (
          <Collapsible 
            key={section.title} 
            open={isOpen} 
            onOpenChange={() => toggleSection(section.title)}
            className="space-y-1"
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-between text-xs md:text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 h-11 md:h-9 px-3",
                  hasActiveItem && "text-primary bg-primary/5",
                  "group"
                )}
              >
                <span className="flex items-center gap-2">
                  {section.title}
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground",
                    hasActiveItem && "bg-primary/10 text-primary"
                  )}>
                    {itemCount}
                  </span>
                </span>
                <span className={cn(
                  "transition-transform duration-200",
                  isOpen && "rotate-180"
                )}>
                  <ChevronDown className={cn(
                    "h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors",
                    hasActiveItem && "text-primary"
                  )} />
                </span>
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="space-y-1 overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.path === "/admin"
                    ? location.pathname === "/admin"
                    : location.pathname.startsWith(item.path);

                return (
                  <Link 
                    key={item.path} 
                    to={item.path}
                    onClick={() => isMobile && setSidebarOpen(false)}
                  >
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className={cn(
                        "w-full justify-start h-11 md:h-9 text-sm pl-6 md:pl-4",
                        isActive && "bg-primary/10 text-primary hover:bg-primary/20 font-medium",
                        !isActive && "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Icon className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                      {isActive && (
                        <ChevronRight className="ml-auto h-4 w-4 text-primary" />
                      )}
                    </Button>
                  </Link>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="flex h-14 md:h-16 items-center justify-between px-3 md:px-6">
          <div className="flex items-center gap-2 md:gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-9 w-9"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label={sidebarOpen ? "Close menu" : "Open menu"}
            >
              {sidebarOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
            <Link to="/" className="text-base md:text-xl font-bold truncate">
              Dilbar Mobiles Admin
            </Link>
          </div>
          <AuthButton />
        </div>

        {/* Mobile vertical dropdown menu */}
        <div 
          className={cn(
            "md:hidden overflow-hidden transition-all duration-300 ease-in-out border-t",
            sidebarOpen ? "max-h-[70vh] opacity-100" : "max-h-0 opacity-0 border-t-0"
          )}
        >
          <div className="p-3 bg-card max-h-[70vh] overflow-y-auto">
            <NavContent />
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar - always visible on desktop */}
        <aside className="hidden md:block bg-card border-r min-h-[calc(100vh-4rem)] w-64 sticky top-16">
          <div className="p-4 overflow-y-auto max-h-[calc(100vh-4rem)]">
            <NavContent />
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-x-hidden min-h-[calc(100vh-3.5rem)] md:min-h-[calc(100vh-4rem)] w-full">
          <div className="p-3 md:p-6 max-w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
