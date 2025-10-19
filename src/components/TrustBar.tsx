import { Truck, Shield, Tag, MapPin } from "lucide-react";

const features = [
  {
    icon: Truck,
    title: "Free Home Delivery",
    description: "In Bahria Phase 7",
  },
  {
    icon: Tag,
    title: "Wholesale Rates",
    description: "Best prices guaranteed",
  },
  {
    icon: Shield,
    title: "Quality Assured",
    description: "Tested & certified",
  },
  {
    icon: MapPin,
    title: "Best Repair Shop",
    description: "Bahria Phase 7",
  },
];

export const TrustBar = () => {
  return (
    <div className="bg-muted/50 py-8 md:py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Icon className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
