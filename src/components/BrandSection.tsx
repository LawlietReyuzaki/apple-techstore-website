import { Card } from "@/components/ui/card";

const brands = [
  { name: "Apple", logo: "🍎" },
  { name: "Samsung", logo: "📱" },
  { name: "Google", logo: "G" },
  { name: "Xiaomi", logo: "Mi" },
  { name: "Huawei", logo: "H" },
  { name: "Oppo", logo: "O" },
  { name: "Vivo", logo: "V" },
  { name: "OnePlus", logo: "1+" },
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
              className="aspect-square flex flex-col items-center justify-center hover:shadow-lg transition-shadow cursor-pointer group"
            >
              <div className="text-3xl md:text-4xl mb-2 group-hover:scale-110 transition-transform">
                {brand.logo}
              </div>
              <span className="text-xs md:text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                {brand.name}
              </span>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
