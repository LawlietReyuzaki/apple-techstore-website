import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Package, Upload, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface ShopCategory {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
}

interface ShopBrand {
  id: string;
  category_id: string;
  name: string;
}

interface ShopModel {
  id: string;
  brand_id: string;
  name: string;
  series: string | null;
}

interface ShopPartType {
  id: string;
  category_id: string;
  name: string;
}

interface ShopItem {
  id: string;
  category_id: string;
  brand_id: string | null;
  model_id: string | null;
  part_type_id: string | null;
  name: string;
  description: string | null;
  price: number;
  sale_price: number | null;
  stock: number;
  images: string[];
  condition: string;
  visible: boolean;
  featured: boolean;
  shop_categories?: { name: string };
  shop_brands?: { name: string } | null;
  shop_models?: { name: string } | null;
  shop_part_types?: { name: string } | null;
}

interface ItemFormData {
  name: string;
  description: string;
  price: string;
  sale_price: string;
  stock: string;
  condition: string;
  visible: boolean;
  featured: boolean;
}

export default function ShopInventory() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [selectedPartType, setSelectedPartType] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<ShopItem | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [formData, setFormData] = useState<ItemFormData>({
    name: "",
    description: "",
    price: "",
    sale_price: "",
    stock: "0",
    condition: "new",
    visible: true,
    featured: false,
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["shop-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_categories")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as ShopCategory[];
    },
  });

  // Fetch brands for selected category
  const { data: brands = [] } = useQuery({
    queryKey: ["shop-brands", selectedCategory],
    queryFn: async () => {
      if (!selectedCategory) return [];
      const { data, error } = await supabase
        .from("shop_brands")
        .select("*")
        .eq("category_id", selectedCategory)
        .order("name");
      if (error) throw error;
      return data as ShopBrand[];
    },
    enabled: !!selectedCategory,
  });

  // Fetch models for selected brand
  const { data: models = [] } = useQuery({
    queryKey: ["shop-models", selectedBrand],
    queryFn: async () => {
      if (!selectedBrand) return [];
      const { data, error } = await supabase
        .from("shop_models")
        .select("*")
        .eq("brand_id", selectedBrand)
        .order("name");
      if (error) throw error;
      return data as ShopModel[];
    },
    enabled: !!selectedBrand,
  });

  // Fetch part types for selected category
  const { data: partTypes = [] } = useQuery({
    queryKey: ["shop-part-types", selectedCategory],
    queryFn: async () => {
      if (!selectedCategory) return [];
      const { data, error } = await supabase
        .from("shop_part_types")
        .select("*")
        .eq("category_id", selectedCategory)
        .order("name");
      if (error) throw error;
      return data as ShopPartType[];
    },
    enabled: !!selectedCategory,
  });

  // Fetch items for selected category
  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["shop-items", selectedCategory],
    queryFn: async () => {
      if (!selectedCategory) return [];
      const { data, error } = await supabase
        .from("shop_items")
        .select(`
          *,
          shop_categories(name),
          shop_brands(name),
          shop_models(name),
          shop_part_types(name)
        `)
        .eq("category_id", selectedCategory)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ShopItem[];
    },
    enabled: !!selectedCategory,
  });

  // Reset dependent selections when category changes
  useEffect(() => {
    setSelectedBrand("");
    setSelectedModel("");
    setSelectedPartType("");
  }, [selectedCategory]);

  useEffect(() => {
    setSelectedModel("");
  }, [selectedBrand]);

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: "",
      sale_price: "",
      stock: "0",
      condition: "new",
      visible: true,
      featured: false,
    });
    setImageFiles([]);
    setExistingImages([]);
    setEditingItem(null);
    setSelectedBrand("");
    setSelectedModel("");
    setSelectedPartType("");
  };

  const handleEdit = (item: ShopItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || "",
      price: item.price.toString(),
      sale_price: item.sale_price?.toString() || "",
      stock: item.stock.toString(),
      condition: item.condition || "new",
      visible: item.visible,
      featured: item.featured,
    });
    setExistingImages(item.images || []);
    setSelectedBrand(item.brand_id || "");
    setSelectedModel(item.model_id || "");
    setSelectedPartType(item.part_type_id || "");
    setDialogOpen(true);
  };

  const uploadImages = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [...existingImages];
    
    for (const file of imageFiles) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `shop-items/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, file);
      
      if (uploadError) {
        console.error("Upload error:", uploadError);
        continue;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);
      
      uploadedUrls.push(publicUrl);
    }
    
    return uploadedUrls;
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCategory) throw new Error("Category is required");
      
      const images = await uploadImages();
      
      const itemData = {
        category_id: selectedCategory,
        brand_id: selectedBrand || null,
        model_id: selectedModel || null,
        part_type_id: selectedPartType || null,
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price) || 0,
        sale_price: formData.sale_price ? parseFloat(formData.sale_price) : null,
        stock: parseInt(formData.stock) || 0,
        images,
        condition: formData.condition,
        visible: formData.visible,
        featured: formData.featured,
      };

      if (editingItem) {
        const { error } = await supabase
          .from("shop_items")
          .update(itemData)
          .eq("id", editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("shop_items")
          .insert(itemData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shop-items"] });
      toast.success(editingItem ? "Item updated successfully" : "Item added successfully");
      setDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("shop_items")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shop-items"] });
      toast.success("Item deleted successfully");
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const validFiles = files.filter(file => 
        ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && 
        file.size <= 5 * 1024 * 1024
      );
      if (validFiles.length !== files.length) {
        toast.error("Some files were skipped (invalid format or >5MB)");
      }
      setImageFiles(prev => [...prev, ...validFiles]);
    }
  };

  const removeNewImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Manage Shop Inventory</h1>
          <p className="text-muted-foreground">Add, edit, and manage items across all shop categories</p>
        </div>
      </div>

      {/* Category Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5" />
            Select Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="flex flex-wrap h-auto gap-1">
              {categories.map((cat) => (
                <TabsTrigger key={cat.id} value={cat.id} className="text-xs sm:text-sm">
                  {cat.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Items Management */}
      {selectedCategory && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">
              Items in {categories.find(c => c.id === selectedCategory)?.name}
            </CardTitle>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingItem ? "Edit Item" : "Add New Item"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Brand Selection */}
                    {brands.length > 0 && (
                      <div className="space-y-2">
                        <Label>Brand</Label>
                        <Select value={selectedBrand || "none"} onValueChange={(v) => setSelectedBrand(v === "none" ? "" : v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select brand" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No brand</SelectItem>
                            {brands.map((brand) => (
                              <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Model Selection */}
                    {models.length > 0 && (
                      <div className="space-y-2">
                        <Label>Model</Label>
                        <Select value={selectedModel || "none"} onValueChange={(v) => setSelectedModel(v === "none" ? "" : v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select model" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No model</SelectItem>
                            {models.map((model) => (
                              <SelectItem key={model.id} value={model.id}>
                                {model.name} {model.series && `(${model.series})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Part Type Selection */}
                    {partTypes.length > 0 && (
                      <div className="space-y-2">
                        <Label>Part Type</Label>
                        <Select value={selectedPartType || "none"} onValueChange={(v) => setSelectedPartType(v === "none" ? "" : v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select part type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No part type</SelectItem>
                            {partTypes.map((pt) => (
                              <SelectItem key={pt.id} value={pt.id}>{pt.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Name */}
                    <div className="space-y-2 md:col-span-2">
                      <Label>Name *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Item name"
                        required
                      />
                    </div>

                    {/* Description */}
                    <div className="space-y-2 md:col-span-2">
                      <Label>Description</Label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Item description"
                        rows={3}
                      />
                    </div>

                    {/* Price */}
                    <div className="space-y-2">
                      <Label>Price (PKR) *</Label>
                      <Input
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                        placeholder="0"
                        min="0"
                        required
                      />
                    </div>

                    {/* Sale Price */}
                    <div className="space-y-2">
                      <Label>Sale Price (PKR)</Label>
                      <Input
                        type="number"
                        value={formData.sale_price}
                        onChange={(e) => setFormData(prev => ({ ...prev, sale_price: e.target.value }))}
                        placeholder="Optional"
                        min="0"
                      />
                    </div>

                    {/* Stock */}
                    <div className="space-y-2">
                      <Label>Stock</Label>
                      <Input
                        type="number"
                        value={formData.stock}
                        onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))}
                        placeholder="0"
                        min="0"
                      />
                    </div>

                    {/* Condition */}
                    <div className="space-y-2">
                      <Label>Condition</Label>
                      <Select value={formData.condition} onValueChange={(v) => setFormData(prev => ({ ...prev, condition: v }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="used">Used</SelectItem>
                          <SelectItem value="refurbished">Refurbished</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Visibility & Featured */}
                    <div className="space-y-4 md:col-span-2">
                      <div className="flex items-center justify-between">
                        <Label>Visible to customers</Label>
                        <Switch
                          checked={formData.visible}
                          onCheckedChange={(v) => setFormData(prev => ({ ...prev, visible: v }))}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Featured item</Label>
                        <Switch
                          checked={formData.featured}
                          onCheckedChange={(v) => setFormData(prev => ({ ...prev, featured: v }))}
                        />
                      </div>
                    </div>

                    {/* Images */}
                    <div className="space-y-2 md:col-span-2">
                      <Label>Images</Label>
                      <div className="border-2 border-dashed rounded-lg p-4">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          onChange={handleFileChange}
                          className="hidden"
                          id="image-upload"
                        />
                        <label
                          htmlFor="image-upload"
                          className="flex flex-col items-center justify-center cursor-pointer"
                        >
                          <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                          <span className="text-sm text-muted-foreground">Click to upload images</span>
                          <span className="text-xs text-muted-foreground">JPG, PNG, WEBP (max 5MB)</span>
                        </label>
                      </div>
                      
                      {/* Existing Images */}
                      {existingImages.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Existing Images</Label>
                          <div className="flex flex-wrap gap-2">
                            {existingImages.map((url, index) => (
                              <div key={index} className="relative">
                                <img src={url} alt="" className="h-16 w-16 object-cover rounded" />
                                <button
                                  type="button"
                                  onClick={() => removeExistingImage(index)}
                                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* New Images Preview */}
                      {imageFiles.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">New Images</Label>
                          <div className="flex flex-wrap gap-2">
                            {imageFiles.map((file, index) => (
                              <div key={index} className="relative">
                                <img
                                  src={URL.createObjectURL(file)}
                                  alt=""
                                  className="h-16 w-16 object-cover rounded"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeNewImage(index)}
                                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Saving..." : editingItem ? "Update Item" : "Add Item"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {itemsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading items...</div>
            ) : items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No items in this category yet</p>
                <p className="text-sm">Click "Add Item" to add your first item</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Image</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Part Type</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          {item.images && item.images[0] ? (
                            <img src={item.images[0]} alt={item.name} className="h-10 w-10 object-cover rounded" />
                          ) : (
                            <div className="h-10 w-10 bg-muted rounded flex items-center justify-center">
                              <ImageIcon className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.shop_brands?.name || "-"}</TableCell>
                        <TableCell>{item.shop_models?.name || "-"}</TableCell>
                        <TableCell>{item.shop_part_types?.name || "-"}</TableCell>
                        <TableCell>
                          <div>
                            <span>PKR {item.price.toLocaleString()}</span>
                            {item.sale_price && (
                              <span className="text-xs text-green-500 ml-2">
                                Sale: PKR {item.sale_price.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.stock > 0 ? "default" : "destructive"}>
                            {item.stock}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {item.visible ? (
                              <Badge variant="outline" className="text-green-500 border-green-500">Visible</Badge>
                            ) : (
                              <Badge variant="outline" className="text-red-500 border-red-500">Hidden</Badge>
                            )}
                            {item.featured && (
                              <Badge variant="secondary">Featured</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="icon" variant="ghost" onClick={() => handleEdit(item)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => {
                                setItemToDelete(item.id);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => itemToDelete && deleteMutation.mutate(itemToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
