import { Truck, Shield, Tag, MapPin } from "lucide-react";
import { useInView } from 'react-intersection-observer';

const features = [
  {
    icon: Truck,
    title: "Free Home Delivery",
    description: "In Bahria Phase 7",
    color: "from-blue-500 to-cyan-500",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: Tag,
    title: "Wholesale Rates",
    description: "Best prices guaranteed",
    color: "from-green-500 to-emerald-500",
    bgColor: "bg-green-500/10",
  },
  {
    icon: Shield,
    title: "Quality Assured",
    description: "Tested & certified",
    color: "from-purple-500 to-pink-500",
    bgColor: "bg-purple-500/10",
  },
  {
    icon: MapPin,
    title: "Best Repair Shop",
    description: "Bahria Phase 7",
    color: "from-orange-500 to-red-500",
    bgColor: "bg-orange-500/10",
  },
];

export const TrustBar = () => {
  const { ref, inView } = useInView({ threshold: 0.2, triggerOnce: true });

  return (
    <div ref={ref} className="relative py-12 md:py-16 overflow-hidden bg-gradient-to-br from-muted/30 via-background to-muted/50">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-accent/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div 
                key={feature.title} 
                className={`group flex flex-col items-center text-center gap-4 transition-all duration-700 ${
                  inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                }`}
                style={{ transitionDelay: `${index * 150}ms` }}
              >
                <div className={`relative w-16 h-16 rounded-2xl ${feature.bgColor} flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg animate-glow`}>
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-xl`} />
                  <Icon className="w-8 h-8 text-primary relative z-10 group-hover:scale-110 transition-transform" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-1 group-hover:text-primary transition-colors text-base md:text-lg">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
