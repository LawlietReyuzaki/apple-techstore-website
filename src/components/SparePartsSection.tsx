import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Search } from "lucide-react";
import { useProductCartStore } from "@/stores/productCartStore";
import { useToast } from "@/hooks/use-toast";

interface SparePart {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  images: string[];
  phone_models: {
    name: string;
    spare_parts_brands: {
      name: string;
      phone_categories: {
        name: string;
      };
    };
  };
  part_categories: {
    name: string;
  };
  part_types?: {
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
  
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [selectedPartCategory, setSelectedPartCategory] = useState<string>("");
  
  const addItem = useProductCartStore((state) => state.addItem);
  const { toast } = useToast();

  useEffect(() => {
    fetchPhoneCategories();
    fetchPartCategories();
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
    filterParts();
  }, [selectedModel, selectedPartCategory, spareParts]);

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

  const fetchSpareParts = async () => {
    const { data } = await supabase
      .from("spare_parts")
      .select(`
        *,
        phone_models (
          name,
          spare_parts_brands (
            name,
            phone_categories (
              name
            )
          )
        ),
        part_categories (name),
        part_types (name),
        spare_parts_colors (color_name, color_code)
      `)
      .eq("visible", true)
      .limit(20);
    
    if (data) {
      setSpareParts(data as any);
      setFilteredParts(data as any);
    }
  };

  const filterParts = () => {
    let filtered = [...spareParts];
    
    if (selectedModel) {
      filtered = filtered.filter(part => part.phone_models?.name === models.find(m => m.id === selectedModel)?.name);
    }
    
    if (selectedPartCategory) {
      filtered = filtered.filter(part => part.part_categories?.name === partCategories.find(c => c.id === selectedPartCategory)?.name);
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
    }, 1);
    
    toast({
      title: "Added to Cart",
      description: `${part.name} has been added to your cart`,
    });
  };

  return (
    <section className="py-16 px-4">
      <div className="container mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-8">
          Phone Spare Parts & Repair Parts
        </h2>
        
        {/* Search Pane */}
        <Card className="mb-8 glass-effect">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Search className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Search Parts</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select Phone Category" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {phoneCategories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedBrand} onValueChange={setSelectedBrand} disabled={!selectedCategory}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select Brand" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {brands.map(brand => (
                    <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedModel} onValueChange={setSelectedModel} disabled={!selectedBrand}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select Model" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {models.map(model => (
                    <SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedPartCategory} onValueChange={setSelectedPartCategory}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Part Category" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  {partCategories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Parts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredParts.map((part) => (
            <Card key={part.id} className="glass-effect overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-square relative overflow-hidden bg-secondary/20">
                {part.images[0] ? (
                  <img
                    src={part.images[0]}
                    alt={part.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-muted-foreground">No Image</span>
                  </div>
                )}
                {part.stock === 0 && (
                  <Badge className="absolute top-2 right-2 bg-destructive">Out of Stock</Badge>
                )}
              </div>
              
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg mb-1 truncate">{part.name}</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {part.phone_models.spare_parts_brands.name} {part.phone_models.name}
                </p>
                <p className="text-sm text-muted-foreground mb-2">{part.part_categories.name}</p>
                
                {part.spare_parts_colors.length > 0 && (
                  <div className="flex gap-2 mb-3">
                    {part.spare_parts_colors.map((color, idx) => (
                      <div
                        key={idx}
                        className="w-6 h-6 rounded-full border-2 border-border"
                        style={{ backgroundColor: color.color_code || '#ccc' }}
                        title={color.color_name}
                      />
                    ))}
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold text-primary">PKR {part.price}</span>
                  <Button
                    size="sm"
                    onClick={() => handleAddToCart(part)}
                    disabled={part.stock === 0}
                  >
                    <ShoppingCart className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredParts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">No spare parts found. Try adjusting your filters.</p>
          </div>
        )}
      </div>
    </section>
  );
};
