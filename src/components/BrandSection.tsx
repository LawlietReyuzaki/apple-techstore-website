import { Card } from "@/components/ui/card";
import appleDevices from "@/assets/brands/apple-devices.jpg";
import samsungPhones from "@/assets/brands/samsung-phones.jpg";
import googlePixel from "@/assets/brands/google-pixel.jpg";
import xiaomiPhone from "@/assets/brands/xiaomi-phone.jpg";
import smartphoneGeneric from "@/assets/brands/smartphone-generic.jpg";

const brands = [
  { name: "Apple", logo: appleDevices },
  { name: "Samsung", logo: samsungPhones },
  { name: "Google", logo: googlePixel },
  { name: "Xiaomi", logo: xiaomiPhone },
  { name: "Huawei", logo: smartphoneGeneric },
  { name: "Oppo", logo: smartphoneGeneric },
  { name: "Vivo", logo: smartphoneGeneric },
  { name: "OnePlus", logo: smartphoneGeneric },
];

export const BrandSection = () => {
  return (
    <section className="py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            All Major Brands Available
          </h2>
          <p className="text-muted-foreground text-lg">
            Every single phone from Google, Apple, Samsung, Huawei, Xiaomi, Vivo, Oppo & more
          </p>
        </div>
        
        <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
          {brands.map((brand) => (
            <Card 
              key={brand.name}
              className="aspect-square flex flex-col items-center justify-center hover:shadow-lg transition-all cursor-pointer group overflow-hidden bg-card"
            >
              <div className="w-full h-full p-2 flex flex-col items-center justify-center">
                <div className="w-full h-16 mb-2 flex items-center justify-center overflow-hidden rounded-md">
                  <img 
                    src={brand.logo} 
                    alt={brand.name}
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-300"
                  />
                </div>
                <span className="text-xs md:text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  {brand.name}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
