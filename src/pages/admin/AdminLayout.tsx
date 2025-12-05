import { useState, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { 
  Home, Wrench, Users, Settings, Package, ShoppingBag, CreditCard, Smartphone,
  Menu, X, ChevronDown, ChevronUp, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AuthButton } from "@/components/AuthButton";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export default function AdminLayout() {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
  }, [isMobile]);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  // Group nav items into sections
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

  const toggleSection = (title: string) => {
    setOpenSections(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  // Check if any item in section is active
  const isSectionActive = (items: typeof navSections[0]['items']) => {
    return items.some(item => 
      item.path === "/admin"
        ? location.pathname === "/admin"
        : location.pathname.startsWith(item.path)
    );
  };

  // Initialize open sections based on active route
  useEffect(() => {
    const initialOpen: Record<string, boolean> = {};
    navSections.forEach(section => {
      if (isSectionActive(section.items)) {
        initialOpen[section.title] = true;
      }
    });
    setOpenSections(initialOpen);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="flex h-14 md:h-16 items-center justify-between px-3 md:px-6">
          <div className="flex items-center gap-2 md:gap-4">
            {/* Mobile menu toggle */}
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
      </header>

      <div className="flex relative">
        {/* Mobile overlay */}
        {isMobile && sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside 
          className={cn(
            "bg-card border-r min-h-[calc(100vh-3.5rem)] md:min-h-[calc(100vh-4rem)] transition-all duration-300 ease-in-out z-40",
            // Mobile styles
            "fixed md:relative",
            "w-[280px] md:w-64",
            sidebarOpen ? "left-0" : "-left-[280px] md:left-0",
            // Desktop always visible
            "md:translate-x-0"
          )}
        >
          <nav className="p-3 md:p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-3.5rem)] md:max-h-[calc(100vh-4rem)]">
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
                        "w-full justify-between text-xs md:text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 h-10 md:h-9 px-3",
                        hasActiveItem && "text-primary bg-primary/5",
                        "group"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        {section.title}
                        {/* Item count badge */}
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
                              "w-full justify-start h-10 md:h-9 text-sm md:text-sm pl-6 md:pl-4",
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

          {/* Sidebar footer - mobile only */}
          <div className="md:hidden absolute bottom-0 left-0 right-0 p-3 border-t bg-card">
            <p className="text-xs text-muted-foreground text-center">
              Dilbar Mobiles © 2024
            </p>
          </div>
        </aside>

        {/* Main content */}
        <main className={cn(
          "flex-1 overflow-x-hidden transition-all duration-300",
          "min-h-[calc(100vh-3.5rem)] md:min-h-[calc(100vh-4rem)]",
          "w-full"
        )}>
          <div className="p-3 md:p-6 max-w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
