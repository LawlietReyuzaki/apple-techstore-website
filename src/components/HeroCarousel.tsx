import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Phone, Wrench, Tag } from "lucide-react";
import { Link } from "react-router-dom";
import wholesalePhonesImg from "@/assets/hero-wholesale-phones.png";
import expertRepairImg from "@/assets/hero-expert-repair.png";
import usedPhonesImg from "@/assets/hero-used-phones.png";

const slides = [
  {
    id: 1,
    title: "Wholesale Phones at Best Prices",
    subtitle: "Every brand • Every model • Best rates in Pakistan",
    cta: "Shop Now",
    icon: Phone,
    type: "image" as const,
    image: wholesalePhonesImg,
  },
  {
    id: 2,
    title: "Expert Repair Services",
    subtitle: "Professional repairs • Quick turnaround • Warranty included",
    cta: "Book Repair",
    icon: Wrench,
    type: "image" as const,
    image: expertRepairImg,
  },
  {
    id: 3,
    title: "Used Phone Shopping Event",
    subtitle: "Premium refurbished phones • Tested & certified • Best deals",
    cta: "Browse Deals",
    icon: Tag,
    type: "image" as const,
    image: usedPhonesImg,
  },
];

export const HeroCarousel = () => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const next = () => setCurrent((prev) => (prev + 1) % slides.length);
  const prev = () => setCurrent((prev) => (prev - 1 + slides.length) % slides.length);

  return (
    <div className="relative h-[500px] md:h-[600px] overflow-hidden rounded-2xl">
      {slides.map((slide, index) => {
        const Icon = slide.icon;
        return (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-all duration-700 ${
              index === current
                ? "opacity-100 translate-x-0"
                : index < current
                ? "opacity-0 -translate-x-full"
                : "opacity-0 translate-x-full"
            }`}
          >
            {slide.type === "image" ? (
              <div className="relative w-full h-full">
                <img 
                  src={slide.image} 
                  alt={slide.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/30" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="container mx-auto px-4 text-center text-white">
                    <h2 className="text-4xl md:text-6xl font-bold mb-4 drop-shadow-lg">
                      {slide.title}
                    </h2>
                    <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-2xl mx-auto drop-shadow-md">
                      {slide.subtitle}
                    </p>
                    {slide.id === 2 ? (
                      <Link to="/book-repair">
                        <Button size="lg" variant="secondary" className="shadow-xl hover:scale-105 transition-transform">
                          {slide.cta}
                        </Button>
                      </Link>
                    ) : (
                      <a href="#products">
                        <Button size="lg" variant="secondary" className="shadow-xl hover:scale-105 transition-transform">
                          {slide.cta}
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className={`w-full h-full bg-gradient-to-br from-primary via-purple-500 to-secondary flex items-center justify-center`}>
                <div className="container mx-auto px-4 text-center text-white">
                  <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm">
                    <Icon className="w-10 h-10" />
                  </div>
                  <h2 className="text-4xl md:text-6xl font-bold mb-4 drop-shadow-lg">
                    {slide.title}
                  </h2>
                  <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-2xl mx-auto">
                    {slide.subtitle}
                  </p>
                  {slide.id === 2 ? (
                    <Link to="/book-repair">
                      <Button size="lg" variant="secondary" className="shadow-xl hover:scale-105 transition-transform">
                        {slide.cta}
                      </Button>
                    </Link>
                  ) : (
                    <a href="#products">
                      <Button size="lg" variant="secondary" className="shadow-xl hover:scale-105 transition-transform">
                        {slide.cta}
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Navigation */}
      <button
        onClick={prev}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors flex items-center justify-center text-white"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={next}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors flex items-center justify-center text-white"
        aria-label="Next slide"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Indicators */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrent(index)}
            className={`h-2 rounded-full transition-all ${
              index === current ? "w-8 bg-white" : "w-2 bg-white/50"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};
