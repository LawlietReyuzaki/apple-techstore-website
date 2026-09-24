import { Button } from "@/components/ui/button";
import { ShoppingBag, TrendingDown, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import wholesaleImage from "@/assets/phones-collection.jpg";

export const WholesaleBanner = () => {
  return (
    <section className="relative h-[240px] md:h-[300px] overflow-hidden rounded-2xl">
      <div className="absolute inset-0">
        <img src={wholesaleImage} alt="Wholesale Phones for Pakistan" className="w-full h-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-transparent" />
      </div>

      <div className="relative h-full flex items-center px-5 md:px-8">
        <div className="max-w-xl text-white">
          <div className="inline-flex items-center gap-2 bg-primary/25 backdrop-blur-sm px-3 py-1 rounded-full mb-3 text-xs font-semibold">
            <TrendingDown className="h-3.5 w-3.5" /> Lowest Prices in Pakistan
          </div>
          <h2 className="text-2xl md:text-4xl font-bold mb-2 leading-tight">
            Wholesale Storefront <span className="text-primary">For Pakistan</span>
          </h2>
          <p className="text-sm md:text-base text-white/85 mb-4 max-w-md">
            Premium smartphones from top brands at wholesale rates. Direct import, genuine products, nationwide delivery.
          </p>
          <div className="flex flex-wrap gap-3 mb-4 text-xs md:text-sm">
            <span className="flex items-center gap-1.5"><Shield className="h-4 w-4 text-green-400" /> 100% Genuine</span>
            <span className="flex items-center gap-1.5"><ShoppingBag className="h-4 w-4 text-blue-400" /> Bulk Discounts</span>
            <span className="flex items-center gap-1.5"><TrendingDown className="h-4 w-4 text-yellow-400" /> Wholesale Prices</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/shop"><Button size="sm">Shop Now</Button></Link>
            <Link to="/book-repair"><Button size="sm" variant="outline" className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20 text-white">Book Repair</Button></Link>
          </div>
        </div>
      </div>
    </section>
  );
};
