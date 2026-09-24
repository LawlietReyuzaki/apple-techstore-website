import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Compact section heading used across the homepage: icon, title, subtitle and a "View all" link. */
export function SectionHeader({ icon: Icon, title, subtitle, to, cta = "View all", light, className }:
  { icon?: React.ComponentType<{ className?: string }>; title: string; subtitle?: string; to?: string; cta?: string; light?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-end justify-between gap-3 mb-4", className)}>
      <div className="flex items-center gap-2.5 min-w-0">
        {Icon && <span className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", light ? "bg-white/10" : "bg-primary/10")}><Icon className={cn("h-4 w-4", light ? "text-white" : "text-primary")} /></span>}
        <div className="min-w-0">
          <h2 className={cn("text-lg md:text-xl font-bold leading-tight truncate", light ? "text-white" : "text-foreground")}>{title}</h2>
          {subtitle && <p className={cn("text-xs md:text-sm truncate", light ? "text-white/70" : "text-muted-foreground")}>{subtitle}</p>}
        </div>
      </div>
      {to && (
        <Link to={to} className={cn("shrink-0 inline-flex items-center gap-1 text-sm font-medium hover:underline", light ? "text-white" : "text-primary")}>
          {cta} <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
