import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { Device } from "@/data/devices";

interface DeviceCardProps {
  device: Device;
}

export const DeviceCard = ({ device }: DeviceCardProps) => {
  return (
    <Card className="group overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 h-full flex flex-col">
      <div className="relative aspect-square bg-gradient-to-br from-secondary/20 to-muted/30 overflow-hidden">
        <img
          src={device.image}
          alt={`${device.brand} ${device.model}`}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          loading="lazy"
        />
        
        {!device.available && (
          <Badge 
            variant="secondary" 
            className="absolute top-3 right-3 bg-yellow-500/90 text-yellow-950 backdrop-blur-sm"
          >
            Coming Soon
          </Badge>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
      
      <CardContent className="p-5 flex-1 flex flex-col">
        <div className="mb-3">
          <Badge variant="outline" className="mb-2 font-medium">
            {device.brand}
          </Badge>
          <h3 className="font-bold text-xl mb-1 group-hover:text-primary transition-colors">
            {device.model}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {device.description}
          </p>
        </div>
        
        <div className="mb-4 flex-1">
          <div className="space-y-1.5">
            {device.keySpecs.slice(0, 3).map((spec, index) => (
              <div key={index} className="flex items-start gap-2 text-xs">
                <Check className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">{spec}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="pt-4 border-t border-border">
          {device.available ? (
            <>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-3xl font-bold text-primary">
                  {device.currency} {device.price.toLocaleString()}
                </span>
              </div>
              <Button className="w-full" size="lg">
                View Details
              </Button>
            </>
          ) : (
            <Button className="w-full" variant="secondary" size="lg" disabled>
              <X className="mr-2 h-4 w-4" />
              Price TBD
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
