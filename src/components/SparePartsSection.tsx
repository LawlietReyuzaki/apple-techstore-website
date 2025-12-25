import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Search, ArrowRight } from "lucide-react";
import { useProductCartStore } from "@/stores/productCartStore";
import { toast } from "sonner";

interface SparePart {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  images: string[];
  featured: boolean | null;
  phone_models: {
    id: string;
    name: string;
    spare_parts_brands: {
      id: string;
      name: string;
      phone_categories: {
        id: string;
        name: string;
      };
    };
  };
  part_categories: {
    id: string;
    name: string;
  };
  part_types?: {
    id: string;
    name: string;
  };
  part_qualities?: {
    id: string;
    name: string;
  };
  spare_parts_colors: {
    color_name: string;
    color_code: string;
  }[];
}

export const SparePartsSection = () => {
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [filteredParts, setFilteredParts] = useState<SparePart[]>([]);
  const [phoneCategories, setPhoneCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [partCategories, setPartCategories] = useState<any[]>([]);
  const [partTypes, setPartTypes] = useState<any[]>([]);
  const [partQualities, setPartQualities] = useState<any[]>([]);
  
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [selectedPartCategory, setSelectedPartCategory] = useState<string>("");
  const [selectedPartType, setSelectedPartType] = useState<string>("");
  const [selectedQuality, setSelectedQuality] = useState<string>("");
  
  const addItem = useProductCartStore((state) => state.addItem);

  useEffect(() => {
    fetchPhoneCategories();
    fetchPartCategories();
    fetchPartQualities();
    fetchSpareParts();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      fetchBrands(selectedCategory);
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (selectedBrand) {
      fetchModels(selectedBrand);
    }
  }, [selectedBrand]);

  useEffect(() => {
    if (selectedPartCategory) {
      fetchPartTypes(selectedPartCategory);
    }
  }, [selectedPartCategory]);

  useEffect(() => {
    filterParts();
  }, [selectedModel, selectedPartCategory, selectedPartType, selectedQuality, spareParts]);

  const fetchPhoneCategories = async () => {
    const { data } = await supabase.from("phone_categories").select("*");
    if (data) setPhoneCategories(data);
  };

  const fetchBrands = async (categoryId: string) => {
    const { data } = await supabase
      .from("spare_parts_brands")
      .select("*")
      .eq("phone_category_id", categoryId);
    if (data) setBrands(data);
  };

  const fetchModels = async (brandId: string) => {
    const { data } = await supabase
      .from("phone_models")
      .select("*")
      .eq("brand_id", brandId);
    if (data) setModels(data);
  };

  const fetchPartCategories = async () => {
    const { data } = await supabase.from("part_categories").select("*");
    if (data) setPartCategories(data);
  };

  const fetchPartTypes = async (categoryId: string) => {
    const { data } = await supabase
      .from("part_types")
      .select("*")
      .eq("category_id", categoryId);
    if (data) setPartTypes(data);
  };

  const fetchPartQualities = async () => {
    const { data } = await supabase
      .from("part_qualities")
      .select("*")
      .order("sort_order");
    if (data) setPartQualities(data);
  };

  const fetchSpareParts = async () => {
    const { data } = await supabase
      .from("spare_parts")
      .select(`
        *,
        phone_models (
          id,
          name,
          spare_parts_brands (
            id,
            name,
            phone_categories (
              id,
              name
            )
          )
        ),
        part_categories (id, name),
        part_types (id, name),
        part_qualities (id, name),
        spare_parts_colors (color_name, color_code)
      `)
      .eq("visible", true)
      .order('featured', { ascending: false })
      .limit(20);
    
    if (data) {
      setSpareParts(data as any);
      setFilteredParts(data as any);
    }
  };

  const filterParts = () => {
    let filtered = [...spareParts];
    
    if (selectedCategory) {
      filtered = filtered.filter(part => 
        part.phone_models?.spare_parts_brands?.phone_categories?.id === selectedCategory
      );
    }

    if (selectedBrand) {
      filtered = filtered.filter(part => 
        part.phone_models?.spare_parts_brands?.id === selectedBrand
      );
    }
    
    if (selectedModel) {
      filtered = filtered.filter(part => 
        part.phone_models?.id === selectedModel
      );
    }
    
    if (selectedPartCategory) {
      filtered = filtered.filter(part => 
        part.part_categories?.id === selectedPartCategory
      );
    }

    if (selectedPartType) {
      filtered = filtered.filter(part => 
        part.part_types?.id === selectedPartType
      );
    }

    if (selectedQuality) {
      filtered = filtered.filter(part => 
        part.part_qualities?.id === selectedQuality
      );
    }
    
    setFilteredParts(filtered);
  };

  const handleAddToCart = (part: SparePart) => {
    addItem({
      id: part.id,
      name: part.name,
      brand: part.phone_models.spare_parts_brands.name,
      price: part.price,
      images: part.images,
      type: 'spare_part',
    });
    
    toast.success(`${part.name} added to cart!`);
  };

  const resetFilters = () => {
    setSelectedCategory("");
    setSelectedBrand("");
    setSelectedModel("");
    setSelectedPartCategory("");
    setSelectedPartType("");
    setSelectedQuality("");
    setBrands([]);
    setModels([]);
    setPartTypes([]);
    setFilteredParts(spareParts);
  };

  return (
    <section className="py-8 sm:py-12 md:py-16 bg-muted/30">
      <div className="container">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">
              Phone Spare Parts & Repair Parts
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Find genuine parts for all major brands
            </p>
          </div>
          <Link to="/spare-parts">
            <Button variant="outline" size="sm">
              View All Parts
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
        
        {/* Search Pane */}
        <Card className="mb-8 glass-card border-border/50">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                <h3 className="text-base sm:text-lg font-semibold">Search Spare Parts</h3>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={resetFilters}
                className="text-xs sm:text-sm"
              >
                Reset
              </Button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Phone Category" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-[100]">
                  {phoneCategories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedBrand} onValueChange={setSelectedBrand} disabled={!selectedCategory}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Brand" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-[100]">
                  {brands.map(brand => (
                    <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedModel} onValueChange={setSelectedModel} disabled={!selectedBrand}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Phone Model" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-[100]">
                  {models.map(model => (
                    <SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedPartCategory} onValueChange={setSelectedPartCategory}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Part Category" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-[100]">
                  {partCategories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedPartType} onValueChange={setSelectedPartType} disabled={!selectedPartCategory}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Part Type" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-[100]">
                  {partTypes.map(type => (
                    <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedQuality} onValueChange={setSelectedQuality}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Quality" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-[100]">
                  {partQualities.map(quality => (
                    <SelectItem key={quality.id} value={quality.id}>{quality.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Parts Grid */}
        {filteredParts.length === 0 ? (
          <Card className="glass-card p-8 sm:p-12 text-center">
            <Search className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl sm:text-2xl font-bold mb-2">No Spare Parts Found</h3>
            <p className="text-muted-foreground mb-6 text-sm sm:text-base">
              Try adjusting your filters or browse all spare parts
            </p>
            <Button onClick={resetFilters}>
              Reset Filters
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 animate-fade-in">
            {filteredParts.map((part) => (
              <Link key={part.id} to={`/spare-part/${part.id}`}>
                <Card className="group hover:shadow-lg transition-all duration-300 h-full flex flex-col overflow-hidden border-border/50">
                  <div className="relative overflow-hidden bg-muted/30">
                    <img
                      src={part.images?.[0] || '/placeholder.svg'}
                      alt={part.name}
                      className="w-full h-64 object-contain group-hover:scale-105 transition-transform duration-300 p-4"
                      loading="lazy"
                    />
                    {part.featured && (
                      <Badge className="absolute top-2 left-2 bg-primary">
                        Featured
                      </Badge>
                    )}
                    {part.stock <= 0 && (
                      <Badge className="absolute top-2 right-2 bg-destructive">
                        Out of Stock
                      </Badge>
                    )}
                    {part.stock > 0 && part.stock <= 5 && (
                      <Badge className="absolute top-2 right-2 bg-orange-500">
                        Low Stock
                      </Badge>
                    )}
                  </div>
                  
                  <CardContent className="flex-1 p-4">
                    <div className="space-y-2">
                      {part.part_categories && (
                        <Badge variant="outline" className="text-xs">
                          {part.part_categories.name}
                        </Badge>
                      )}
                      <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors">
                        {part.name}
                      </h3>
                      {part.phone_models && (
                        <p className="text-sm text-muted-foreground">
                          For {part.phone_models.spare_parts_brands.name} {part.phone_models.name}
                        </p>
                      )}
                      {part.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {part.description}
                        </p>
                      )}
                    </div>
                  </CardContent>
                  
                  <CardContent className="p-4 pt-0 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-2xl font-bold text-primary">
                        Rs. {part.price.toLocaleString()}
                      </p>
                      {part.stock > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {part.stock} in stock
                        </p>
                      )}
                    </div>
                    <Button 
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        handleAddToCart(part);
                      }}
                      disabled={part.stock <= 0}
                      className="gap-2"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Add
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
