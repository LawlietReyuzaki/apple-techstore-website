import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { devices } from "@/data/devices";

// Get unique brands from devices data
const brands = Array.from(new Set(devices.map(d => d.brand))).sort();

interface ProductFiltersProps {
  filters: {
    brands: string[];
    availability: "all" | "available" | "coming-soon";
    priceRange: [number, number];
  };
  onFilterChange: (filters: any) => void;
}

export const ProductFilters = ({ filters, onFilterChange }: ProductFiltersProps) => {
  const handleBrandToggle = (brand: string) => {
    const newBrands = filters.brands.includes(brand)
      ? filters.brands.filter((b) => b !== brand)
      : [...filters.brands, brand];
    onFilterChange({ ...filters, brands: newBrands });
  };

  const handleAvailabilityChange = (value: string) => {
    onFilterChange({ ...filters, availability: value as "all" | "available" | "coming-soon" });
  };

  const handlePriceChange = (value: number[]) => {
    onFilterChange({ ...filters, priceRange: value as [number, number] });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Brand Filter */}
        <div>
          <h3 className="font-semibold mb-3">Brand</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {brands.map((brand) => (
              <div key={brand} className="flex items-center space-x-2">
                <Checkbox
                  id={`brand-${brand}`}
                  checked={filters.brands.includes(brand)}
                  onCheckedChange={() => handleBrandToggle(brand)}
                />
                <Label
                  htmlFor={`brand-${brand}`}
                  className="text-sm cursor-pointer"
                >
                  {brand}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Availability Filter */}
        <div>
          <h3 className="font-semibold mb-3">Availability</h3>
          <RadioGroup value={filters.availability} onValueChange={handleAvailabilityChange}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all" id="availability-all" />
              <Label htmlFor="availability-all" className="text-sm cursor-pointer">
                All Devices
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="available" id="availability-available" />
              <Label htmlFor="availability-available" className="text-sm cursor-pointer">
                Available Now
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="coming-soon" id="availability-coming-soon" />
              <Label htmlFor="availability-coming-soon" className="text-sm cursor-pointer">
                Coming Soon
              </Label>
            </div>
          </RadioGroup>
        </div>

        <Separator />

        {/* Price Range */}
        <div>
          <h3 className="font-semibold mb-3">Price Range (PKR)</h3>
          <div className="space-y-4">
            <Slider
              min={0}
              max={500000}
              step={5000}
              value={filters.priceRange}
              onValueChange={handlePriceChange}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>PKR {filters.priceRange[0].toLocaleString()}</span>
              <span>PKR {filters.priceRange[1].toLocaleString()}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
