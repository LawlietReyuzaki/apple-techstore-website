import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";

const brands = ["Apple", "Samsung", "Google", "Xiaomi", "Huawei", "Oppo", "Vivo"];
const conditions = ["New", "Used", "Refurbished"];

interface ProductFiltersProps {
  filters: {
    brands: string[];
    conditions: string[];
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

  const handleConditionToggle = (condition: string) => {
    const newConditions = filters.conditions.includes(condition)
      ? filters.conditions.filter((c) => c !== condition)
      : [...filters.conditions, condition];
    onFilterChange({ ...filters, conditions: newConditions });
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
          <div className="space-y-2">
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

        {/* Condition Filter */}
        <div>
          <h3 className="font-semibold mb-3">Condition</h3>
          <div className="space-y-2">
            {conditions.map((condition) => (
              <div key={condition} className="flex items-center space-x-2">
                <Checkbox
                  id={`condition-${condition}`}
                  checked={filters.conditions.includes(condition)}
                  onCheckedChange={() => handleConditionToggle(condition)}
                />
                <Label
                  htmlFor={`condition-${condition}`}
                  className="text-sm cursor-pointer"
                >
                  {condition}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Price Range */}
        <div>
          <h3 className="font-semibold mb-3">Price Range</h3>
          <div className="space-y-4">
            <Slider
              min={0}
              max={200000}
              step={1000}
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
