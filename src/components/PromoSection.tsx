import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Wrench, ShoppingBag, Award } from "lucide-react";
import { Link } from "react-router-dom";
import repairImage from "@/assets/phone-repair.jpg";
import techBg from "@/assets/tech-background.jpg";

export const PromoSection = () => {
  return (
    <section className="py-12 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Pro Repair Services Banner */}
          <Card className="overflow-hidden group hover:shadow-xl transition-all duration-300">
            <div className="relative h-64 md:h-80">
              <img
                src={repairImage}
                alt="Professional Phone Repair Services"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Wrench className="h-5 w-5" />
                  <span className="text-sm font-semibold uppercase tracking-wider">
                    Pro Services
                  </span>
                </div>
                <h3 className="text-2xl font-bold mb-2">
                  Expert Phone Repair
                </h3>
                <p className="text-white/90 mb-4">
                  Screen replacement, battery, charging ports & more. Same-day service available.
                </p>
                <Link to="/book-repair">
                  <Button variant="secondary" className="group/btn">
                    Book Repair Now
                    <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </div>
          </Card>

          {/* Parts Request Banner */}
          <Card className="overflow-hidden group hover:shadow-xl transition-all duration-300">
            <div className="relative h-64 md:h-80">
              <img
                src={techBg}
                alt="Order Genuine Parts"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/60 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingBag className="h-5 w-5" />
                  <span className="text-sm font-semibold uppercase tracking-wider">
                    Genuine Parts
                  </span>
                </div>
                <h3 className="text-2xl font-bold mb-2">
                  Parts Request Form
                </h3>
                <p className="text-white/90 mb-4">
                  Can't find what you need? Request specific parts & accessories for any phone model.
                </p>
                <Link to="/shop">
                  <Button variant="secondary" className="group/btn">
                    Request Parts
                    <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>

        {/* Trust Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 text-center hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Award className="h-6 w-6 text-primary" />
            </div>
            <h4 className="font-semibold mb-2">Certified Technicians</h4>
            <p className="text-sm text-muted-foreground">
              Expert team with 10+ years experience
            </p>
          </Card>

          <Card className="p-6 text-center hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-full bg-green-600/10 flex items-center justify-center mx-auto mb-4">
              <Wrench className="h-6 w-6 text-green-600" />
            </div>
            <h4 className="font-semibold mb-2">90-Day Warranty</h4>
            <p className="text-sm text-muted-foreground">
              All repairs covered with warranty
            </p>
          </Card>

          <Card className="p-6 text-center hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-full bg-blue-600/10 flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="h-6 w-6 text-blue-600" />
            </div>
            <h4 className="font-semibold mb-2">Genuine Parts Only</h4>
            <p className="text-sm text-muted-foreground">
              100% authentic components guaranteed
            </p>
          </Card>
        </div>
      </div>
    </section>
  );
};
