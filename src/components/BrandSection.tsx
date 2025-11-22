import { Card } from "@/components/ui/card";
import { useInView } from 'react-intersection-observer';
import appleDevices from "@/assets/brands/apple-devices.jpg";
import samsungPhones from "@/assets/brands/samsung-phones.jpg";
import googlePixel from "@/assets/brands/google-pixel.jpg";
import xiaomiPhone from "@/assets/brands/xiaomi-new.jpg";
import huaweiPhone from "@/assets/brands/huawei.jpg";
import oppoPhone from "@/assets/brands/oppo.jpg";
import vivoPhone from "@/assets/brands/vivo.jpg";
import oneplusPhone from "@/assets/brands/oneplus.jpg";

const brands = [
  { name: "Apple", logo: appleDevices },
  { name: "Samsung", logo: samsungPhones },
  { name: "Google", logo: googlePixel },
  { name: "Xiaomi", logo: xiaomiPhone },
  { name: "Huawei", logo: huaweiPhone },
  { name: "Oppo", logo: oppoPhone },
  { name: "Vivo", logo: vivoPhone },
  { name: "OnePlus", logo: oneplusPhone },
];

export const BrandSection = () => {
  const { ref, inView } = useInView({ threshold: 0.2, triggerOnce: true });

  return (
    <section ref={ref} className="relative py-16 md:py-20 overflow-hidden bg-black">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-white/3 to-white/3 rounded-full blur-3xl" />
      </div>

      {/* Glowing top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer" />

      <div className="container mx-auto px-4 relative z-10">
        <div className={`text-center mb-12 transition-all duration-700 ${
          inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <h2 className="text-4xl md:text-5xl font-extrabold mb-4 text-white tracking-tight">
            All Major Brands Available
          </h2>
          <p className="text-white text-lg md:text-xl max-w-3xl mx-auto font-light">
            Every single phone from Google, Apple, Samsung, Huawei, Xiaomi, Vivo, Oppo & more
          </p>
        </div>
        
        <div className="grid grid-cols-4 md:grid-cols-8 gap-6">
          {brands.map((brand, index) => (
            <Card 
              key={brand.name}
              className={`relative group aspect-square flex flex-col items-center justify-center hover:shadow-2xl hover:shadow-white/20 cursor-pointer overflow-hidden bg-gradient-to-br from-gray-900 to-black border-white/20 hover:border-white/50 transition-all duration-700 hover:scale-110 ${
                inView ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              {/* Glow effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="w-full h-full p-3 flex flex-col items-center justify-center relative z-10">
                <div className="w-full h-16 mb-2 flex items-center justify-center overflow-hidden rounded-lg">
                  <img 
                    src={brand.logo} 
                    alt={brand.name}
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-125 transition-all duration-500"
                  />
                </div>
                <span className="text-xs md:text-sm font-bold text-gray-400 group-hover:text-white transition-colors duration-300">
                  {brand.name}
                </span>
              </div>

              {/* Corner decorations */}
              <div className="absolute top-1 right-1 w-2 h-2 bg-white/20 rounded-full group-hover:scale-150 transition-transform" />
              <div className="absolute bottom-1 left-1 w-2 h-2 bg-white/20 rounded-full group-hover:scale-150 transition-transform" />
            </Card>
          ))}
        </div>
      </div>

      {/* Glowing bottom border */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer" style={{ animationDelay: '1s' }} />
    </section>
  );
};
