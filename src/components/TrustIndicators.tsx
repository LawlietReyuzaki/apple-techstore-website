import { Award, Shield, ShoppingBag } from "lucide-react";

const items = [
  { icon: Award, title: "Certified Technicians", description: "Expert team with 10+ years experience" },
  { icon: Shield, title: "90-Day Warranty", description: "All repairs covered with warranty" },
  { icon: ShoppingBag, title: "Genuine Parts Only", description: "100% authentic components guaranteed" },
];

/** Certified technicians / 90-day warranty / genuine parts — shown near the bottom of the homepage. */
export function TrustIndicators() {
  return (
    <section className="border-t border-border/50 bg-muted/20">
      <div className="container py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {items.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex items-center gap-3 rounded-xl border border-border/50 bg-card p-4">
              <span className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><Icon className="h-5 w-5 text-primary" /></span>
              <div>
                <h3 className="font-semibold text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
