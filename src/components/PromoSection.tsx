import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Wrench, ShoppingBag, Award, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { useInView } from 'react-intersection-observer';
import repairImage from "@/assets/phone-repair.jpg";
import techBg from "@/assets/tech-background.jpg";

export const PromoSection = () => {
  const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true });

  const trustIndicators = [
    {
      icon: Award,
      title: "Certified Technicians",
      description: "Expert team with 10+ years experience",
      gradient: "from-yellow-500 to-orange-500",
      bgColor: "bg-yellow-500/10",
    },
    {
      icon: Shield,
      title: "90-Day Warranty",
      description: "All repairs covered with warranty",
      gradient: "from-green-500 to-emerald-500",
      bgColor: "bg-green-500/10",
    },
    {
      icon: ShoppingBag,
      title: "Genuine Parts Only",
      description: "100% authentic components guaranteed",
      gradient: "from-blue-500 to-cyan-500",
      bgColor: "bg-blue-500/10",
    },
  ];

  return (
    <section ref={ref} className="py-12 bg-gradient-to-b from-background to-muted/30 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 right-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-10 left-1/3 w-72 h-72 bg-accent/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Pro Repair Services Banner */}
          <Card className={`overflow-hidden group hover:shadow-2xl transition-all duration-700 border-primary/20 ${
            inView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'
          }`}>
            <div className="relative h-64 md:h-80">
              <img
                src={repairImage}
                alt="Professional Phone Repair Services"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
              
              {/* Animated gradient border on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/30 via-transparent to-accent/30" />
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <div className="flex items-center gap-2 mb-3 animate-slide-in-left">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 backdrop-blur-sm flex items-center justify-center">
                    <Wrench className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-sm font-bold uppercase tracking-widest">
                    Pro Services
                  </span>
                </div>
                <h3 className="text-3xl font-extrabold mb-3 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                  Expert Phone Repair
                </h3>
                <p className="text-white/90 mb-5 leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                  Screen replacement, battery, charging ports & more. Same-day service available.
                </p>
                <Link to="/book-repair">
                  <Button 
                    className="group/btn bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 animate-fade-in-up"
                    style={{ animationDelay: '0.3s' }}
                  >
                    Book Repair Now
                    <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-2 transition-transform" />
                  </Button>
                </Link>
              </div>
            </div>
          </Card>

          {/* Parts Request Banner */}
          <Card className={`overflow-hidden group hover:shadow-2xl transition-all duration-700 border-accent/20 ${
            inView ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'
          }`} style={{ transitionDelay: '0.2s' }}>
            <div className="relative h-64 md:h-80">
              <img
                src={techBg}
                alt="Order Genuine Parts"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/70 to-transparent" />
              
              {/* Animated gradient border on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <div className="absolute inset-0 bg-gradient-to-r from-accent/30 via-transparent to-primary/30" />
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <div className="flex items-center gap-2 mb-3 animate-slide-in-right">
                  <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <ShoppingBag className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-sm font-bold uppercase tracking-widest">
                    Genuine Parts
                  </span>
                </div>
                <h3 className="text-3xl font-extrabold mb-3 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                  Parts Request Form
                </h3>
                <p className="text-white/90 mb-5 leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                  Can't find what you need? Request specific parts & accessories for any phone model.
                </p>
                <Link to="/request-part">
                  <Button 
                    className="group/btn bg-white text-primary hover:bg-white/90 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 animate-fade-in-up"
                    style={{ animationDelay: '0.3s' }}
                  >
                    Request Parts
                    <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-2 transition-transform" />
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>

        {/* Trust Indicators with Enhanced Animations */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {trustIndicators.map((indicator, index) => {
            const Icon = indicator.icon;
            return (
              <Card 
                key={indicator.title}
                className={`group relative overflow-hidden p-8 text-center hover:shadow-2xl hover:scale-105 transition-all duration-500 border-primary/20 ${
                  inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                }`}
                style={{ transitionDelay: `${index * 150}ms` }}
              >
                {/* Animated background gradient on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${indicator.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
                
                {/* Icon with glow effect */}
                <div className="relative mb-6">
                  <div className={`absolute inset-0 ${indicator.bgColor} blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-pulse-slow`} />
                  <div className={`w-16 h-16 rounded-2xl ${indicator.bgColor} flex items-center justify-center mx-auto group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 shadow-lg relative z-10`}>
                    <Icon className={`h-8 w-8 text-primary group-hover:scale-110 transition-transform`} />
                  </div>
                </div>

                <h4 className="font-bold text-lg mb-3 group-hover:text-primary transition-colors">
                  {indicator.title}
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors">
                  {indicator.description}
                </p>

                {/* Decorative corner elements */}
                <div className="absolute top-2 right-2 w-2 h-2 bg-primary/20 rounded-full group-hover:scale-150 transition-transform" />
                <div className="absolute bottom-2 left-2 w-2 h-2 bg-accent/20 rounded-full group-hover:scale-150 transition-transform" />
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};
