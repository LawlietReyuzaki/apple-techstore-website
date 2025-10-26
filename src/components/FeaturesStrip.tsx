import { MessageCircle, Truck, Shield, CreditCard, BadgeDollarSign } from "lucide-react";

const features = [
  { icon: MessageCircle, text: "WhatsApp Support" },
  { icon: Truck, text: "Free Delivery From Rs: 4,999/-" },
  { icon: Shield, text: "Damage Protection" },
  { icon: CreditCard, text: "Safe & Secure Payment" },
  { icon: BadgeDollarSign, text: "Low Prices Guaranteed" },
];

export const FeaturesStrip = () => {
  return (
    <div className="bg-primary text-primary-foreground py-3 overflow-hidden relative">
      <div className="flex animate-scroll-left">
        {/* First set */}
        {features.map((feature, index) => (
          <div
            key={`first-${index}`}
            className="flex items-center gap-2 px-8 whitespace-nowrap"
          >
            <feature.icon className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm md:text-base font-medium">{feature.text}</span>
          </div>
        ))}
        {/* Duplicate set for seamless loop */}
        {features.map((feature, index) => (
          <div
            key={`second-${index}`}
            className="flex items-center gap-2 px-8 whitespace-nowrap"
          >
            <feature.icon className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm md:text-base font-medium">{feature.text}</span>
          </div>
        ))}
        {/* Third set for extra smoothness */}
        {features.map((feature, index) => (
          <div
            key={`third-${index}`}
            className="flex items-center gap-2 px-8 whitespace-nowrap"
          >
            <feature.icon className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm md:text-base font-medium">{feature.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
