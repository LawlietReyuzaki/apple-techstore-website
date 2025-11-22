import { MessageCircle, Truck, Shield, CreditCard, BadgeDollarSign } from "lucide-react";

const features = [
  { icon: MessageCircle, text: "WhatsApp Support", color: "text-green-400" },
  { icon: Truck, text: "Free Delivery From Rs: 4,999/-", color: "text-blue-400" },
  { icon: Shield, text: "Damage Protection", color: "text-purple-400" },
  { icon: CreditCard, text: "Safe & Secure Payment", color: "text-cyan-400" },
  { icon: BadgeDollarSign, text: "Low Prices Guaranteed", color: "text-yellow-400" },
];

export const FeaturesStrip = () => {
  return (
    <div className="relative bg-gradient-to-r from-black via-gray-900 to-black text-white py-4 overflow-hidden">
      {/* Animated glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 opacity-30 animate-gradient-shift" />
      
      {/* Glowing top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent animate-shimmer" />
      
      <div className="flex animate-scroll-left relative z-10">
        {/* First set */}
        {features.map((feature, index) => (
          <div
            key={`first-${index}`}
            className="flex items-center gap-3 px-10 whitespace-nowrap group"
          >
            <div className="relative">
              <div className={`absolute inset-0 ${feature.color} opacity-20 blur-lg animate-pulse-slow`} />
              <feature.icon className={`h-6 w-6 flex-shrink-0 ${feature.color} relative z-10 group-hover:scale-110 transition-transform drop-shadow-lg`} />
            </div>
            <span className="text-sm md:text-base font-semibold tracking-wide group-hover:text-primary transition-colors">
              {feature.text}
            </span>
            <div className="w-px h-6 bg-gradient-to-b from-transparent via-white/20 to-transparent ml-10" />
          </div>
        ))}
        {/* Duplicate set for seamless loop */}
        {features.map((feature, index) => (
          <div
            key={`second-${index}`}
            className="flex items-center gap-3 px-10 whitespace-nowrap group"
          >
            <div className="relative">
              <div className={`absolute inset-0 ${feature.color} opacity-20 blur-lg animate-pulse-slow`} />
              <feature.icon className={`h-6 w-6 flex-shrink-0 ${feature.color} relative z-10 group-hover:scale-110 transition-transform drop-shadow-lg`} />
            </div>
            <span className="text-sm md:text-base font-semibold tracking-wide group-hover:text-primary transition-colors">
              {feature.text}
            </span>
            <div className="w-px h-6 bg-gradient-to-b from-transparent via-white/20 to-transparent ml-10" />
          </div>
        ))}
        {/* Third set for extra smoothness */}
        {features.map((feature, index) => (
          <div
            key={`third-${index}`}
            className="flex items-center gap-3 px-10 whitespace-nowrap group"
          >
            <div className="relative">
              <div className={`absolute inset-0 ${feature.color} opacity-20 blur-lg animate-pulse-slow`} />
              <feature.icon className={`h-6 w-6 flex-shrink-0 ${feature.color} relative z-10 group-hover:scale-110 transition-transform drop-shadow-lg`} />
            </div>
            <span className="text-sm md:text-base font-semibold tracking-wide group-hover:text-primary transition-colors">
              {feature.text}
            </span>
            <div className="w-px h-6 bg-gradient-to-b from-transparent via-white/20 to-transparent ml-10" />
          </div>
        ))}
      </div>

      {/* Glowing bottom border */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent animate-shimmer" style={{ animationDelay: '1s' }} />
    </div>
  );
};
