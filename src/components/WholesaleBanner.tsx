import { Button } from "@/components/ui/button";
import { ShoppingBag, TrendingDown, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import wholesaleImage from "@/assets/phones-collection.jpg";

export const WholesaleBanner = () => {
  return (
    <section className="relative h-[500px] md:h-[600px] overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={wholesaleImage}
          alt="Wholesale Phones for Pakistan"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-transparent" />
      </div>
      
      <div className="relative container mx-auto px-4 h-full flex items-center">
        <div className="max-w-2xl text-white">
          <div className="inline-flex items-center gap-2 bg-primary/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6 animate-fade-in">
            <TrendingDown className="h-4 w-4" />
            <span className="text-sm font-semibold">Lowest Prices in Pakistan</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-4 animate-fade-in">
            Wholesale Storefront
            <br />
            <span className="text-primary">For Pakistan</span>
          </h1>
          
          <p className="text-lg md:text-xl text-white/90 mb-8 animate-fade-in">
            Premium smartphones from top brands at unbeatable wholesale rates. 
            Direct import, genuine products, nationwide delivery.
          </p>
          
          <div className="flex flex-wrap gap-4 mb-8 animate-fade-in">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-400" />
              <span className="text-sm">100% Genuine</span>
            </div>
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-blue-400" />
              <span className="text-sm">Bulk Discounts</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-yellow-400" />
              <span className="text-sm">Wholesale Prices</span>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 animate-fade-in">
            <Link to="/shop">
              <Button size="lg" className="text-lg px-8">
                Shop Now
              </Button>
            </Link>
            <Link to="/book-repair">
              <Button size="lg" variant="outline" className="text-lg px-8 bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20">
                Book Repair
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
