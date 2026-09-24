import { ArrowRight, Wrench, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import repairImage from "@/assets/phone-repair.jpg";
import techBg from "@/assets/tech-background.jpg";

const banners = [
  {
    image: repairImage, alt: "Professional Phone Repair Services", icon: Wrench, kicker: "Pro Services",
    title: "Expert Phone Repair", text: "Screens, batteries, charging ports & more. Same-day service.",
    to: "/book-repair", cta: "Book Repair", overlay: "from-black/90 via-black/55 to-black/10",
  },
  {
    image: techBg, alt: "Order Genuine Parts", icon: ShoppingBag, kicker: "Genuine Parts",
    title: "Can't Find a Part?", text: "Request parts & accessories for any phone model.",
    to: "/request-part", cta: "Request Parts", overlay: "from-primary/95 via-primary/70 to-primary/10",
  },
];

/** Two promo banners: repair booking and parts request. `stacked` puts them in one column (beside the hero). */
export const PromoSection = ({ stacked = false, className }: { stacked?: boolean; className?: string }) => (
  <section className={cn("grid gap-3 md:gap-4", stacked ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-1" : "md:grid-cols-2", className)}>
    {banners.map((b) => (
      <Link key={b.to} to={b.to} className="group relative block h-40 lg:h-full lg:min-h-[176px] rounded-2xl overflow-hidden border border-border/50">
        <img src={b.image} alt={b.alt} loading="lazy" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className={`absolute inset-0 bg-gradient-to-t ${b.overlay}`} />
        <div className="absolute inset-0 p-4 flex flex-col justify-end text-white">
          <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold uppercase tracking-widest text-white/85"><b.icon className="h-3.5 w-3.5" /> {b.kicker}</div>
          <h3 className="text-lg md:text-xl font-extrabold leading-tight">{b.title}</h3>
          <p className="text-xs text-white/85 mt-0.5 mb-2 max-w-xs">{b.text}</p>
          <span className="inline-flex items-center gap-1 text-xs font-semibold underline-offset-4 group-hover:underline">{b.cta} <ArrowRight className="h-3.5 w-3.5" /></span>
        </div>
      </Link>
    ))}
  </section>
);
