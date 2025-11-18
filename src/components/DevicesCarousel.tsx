import { devices } from "@/data/devices";
import { DeviceCard } from "./DeviceCard";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Smartphone } from "lucide-react";

export const DevicesCarousel = () => {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Smartphone className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Premium Phones & Devices
          </h2>
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">
            Explore our curated collection of flagship smartphones from leading brands with competitive pricing
          </p>
        </div>

        <div className="relative px-12">
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {devices.map((device) => (
                <CarouselItem 
                  key={device.id} 
                  className="pl-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4"
                >
                  <DeviceCard device={device} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex -left-6 h-12 w-12 hover:scale-110 transition-transform" />
            <CarouselNext className="hidden md:flex -right-6 h-12 w-12 hover:scale-110 transition-transform" />
          </Carousel>
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            Drag to browse • Click arrows to navigate • All prices in Pakistani Rupees (PKR)
          </p>
        </div>
      </div>
    </section>
  );
};
