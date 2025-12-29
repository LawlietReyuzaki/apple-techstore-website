import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Package, X, Upload, Smartphone, Wrench, Laptop, Headphones } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";

interface ProductColor {
  id?: string;
  color_name: string;
  color_code: string;
}

interface ProductPartType {
  id?: string;
  part_type_name: string;
}

interface ProductFormData {
  name: string;
  brand: string;
  category_id: string;
  description: string;
  price: string;
  wholesale_price: string;
  stock: string;
  images: string[];
  featured: boolean;
  availability_status: string;
  discount_percentage: string;
  on_sale: boolean;
  sale_price: string;
  accessory_subcategory: string;
  colors: ProductColor[];
  has_color_options: boolean;
  has_part_type_options: boolean;
  part_types: ProductPartType[];
}

const ACCESSORY_SUBCATEGORIES = [
  { value: "none", label: "None" },
  { value: "mobile", label: "Mobile Accessories" },
  { value: "laptop", label: "Laptop Accessories" },
  { value: "pc", label: "PC Accessories" },
  { value: "computer", label: "Computer Accessories" },
];

const CATEGORY_FILTERS = [
  { value: "all", label: "All", icon: Package },
  { value: "phones", label: "Phones", icon: Smartphone },
  { value: "used-phones", label: "Used Phones", icon: Smartphone },
  { value: "laptops", label: "Laptops", icon: Laptop },
  { value: "accessories", label: "Accessories", icon: Headphones },
];

const ACCESSORY_SUB_FILTERS = [
  { value: "all", label: "All Accessories" },
  { value: "mobile", label: "Mobile" },
  { value: "laptop", label: "Laptop" },
  { value: "pc", label: "PC" },
  { value: "computer", label: "Computer" },
];

export default function AdminProducts() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin, loading: authLoading } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    brand: "",
    category_id: "",
    description: "",
    price: "",
    wholesale_price: "",
    stock: "0",
    images: [],
    featured: false,
    availability_status: "available",
    discount_percentage: "0",
    on_sale: false,
    sale_price: "",
    accessory_subcategory: "none",
    colors: [],
    has_color_options: false,
    has_part_type_options: false,
    part_types: [],
  });
  const [newColor, setNewColor] = useState({ color_name: "", color_code: "#000000" });
  const [newPartType, setNewPartType] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [accessorySubFilter, setAccessorySubFilter] = useState("all");

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error("Access denied");
      navigate("/");
    }
  }, [isAdmin, authLoading, navigate]);

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const uploadImages = async () => {
    if (imageFiles.length === 0) return formData.images.filter(img => img);
    
    setUploadingImages(true);
    const uploadedUrls: string[] = [...formData.images.filter(img => img)];
    
    try {
      for (const file of imageFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }
      
      setUploadingImages(false);
      return uploadedUrls;
    } catch (error) {
      setUploadingImages(false);
      toast.error("Image upload failed", { 
        description: error instanceof Error ? error.message : "Unknown error"
      });
      throw error;
    }
  };

const createOrUpdateMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const uploadedImages = await uploadImages();
      
      const productData = {
        name: data.name,
        brand: data.brand,
        category_id: data.category_id || null,
        description: data.description,
        price: parseFloat(data.price),
        wholesale_price: data.wholesale_price ? parseFloat(data.wholesale_price) : null,
        stock: parseInt(data.stock),
        images: uploadedImages,
        featured: data.featured,
        on_sale: data.on_sale,
        sale_price: data.sale_price ? parseFloat(data.sale_price) : null,
        accessory_subcategory: data.accessory_subcategory === "none" ? null : (data.accessory_subcategory || null),
        has_color_options: data.has_color_options,
        has_part_type_options: data.has_part_type_options,
      };

      let productId = editingProduct?.id;

      if (editingProduct) {
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", editingProduct.id);
        if (error) throw error;
      } else {
        const { data: newProduct, error } = await supabase
          .from("products")
          .insert(productData)
          .select()
          .single();
        if (error) throw error;
        productId = newProduct.id;
      }

      // Handle colors - delete existing and insert new ones
      if (productId) {
        // Delete existing colors
        await supabase
          .from("product_colors")
          .delete()
          .eq("product_id", productId);

        // Insert new colors if color options are enabled
        if (data.has_color_options && data.colors.length > 0) {
          const colorsToInsert = data.colors.map(c => ({
            product_id: productId,
            color_name: c.color_name,
            color_code: c.color_code || null,
          }));
          
          const { error: colorError } = await supabase
            .from("product_colors")
            .insert(colorsToInsert);
          if (colorError) throw colorError;
        }

        // Delete existing part types
        await supabase
          .from("product_part_types")
          .delete()
          .eq("product_id", productId);

        // Insert new part types if part type options are enabled
        if (data.has_part_type_options && data.part_types.length > 0) {
          const partTypesToInsert = data.part_types.map(pt => ({
            product_id: productId,
            part_type_name: pt.part_type_name,
          }));
          
          const { error: partTypeError } = await supabase
            .from("product_part_types")
            .insert(partTypesToInsert);
          if (partTypeError) throw partTypeError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      setIsDialogOpen(false);
      setEditingProduct(null);
      resetForm();
      toast.success(editingProduct ? "Product updated" : "Product created");
    },
    onError: (error: any) => {
      toast.error("Failed to save product", { description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Product deleted");
    },
    onError: () => {
      toast.error("Failed to delete product");
    },
  });

const resetForm = () => {
    setFormData({
      name: "",
      brand: "",
      category_id: "",
      description: "",
      price: "",
      wholesale_price: "",
      stock: "0",
      images: [],
      featured: false,
      availability_status: "available",
      discount_percentage: "0",
      on_sale: false,
      sale_price: "",
      accessory_subcategory: "none",
      colors: [],
      has_color_options: false,
      has_part_type_options: false,
      part_types: [],
    });
    setImageFiles([]);
    setImagePreviews([]);
    setNewColor({ color_name: "", color_code: "#000000" });
    setNewPartType("");
  };

const handleEdit = async (product: any) => {
    setEditingProduct(product);
    
    // Fetch colors and part types for this product in parallel
    const [colorsResult, partTypesResult] = await Promise.all([
      supabase
        .from("product_colors")
        .select("*")
        .eq("product_id", product.id),
      supabase
        .from("product_part_types")
        .select("*")
        .eq("product_id", product.id),
    ]);
    
    const productColors = colorsResult.data;
    const productPartTypes = partTypesResult.data;
    
    setFormData({
      name: product.name,
      brand: product.brand,
      category_id: product.category_id || "",
      description: product.description || "",
      price: product.price.toString(),
      wholesale_price: product.wholesale_price?.toString() || "",
      stock: product.stock.toString(),
      images: product.images || [],
      featured: product.featured || false,
      availability_status: product.stock > 0 ? "available" : "out_of_stock",
      discount_percentage: "0",
      on_sale: product.on_sale || false,
      sale_price: product.sale_price?.toString() || "",
      accessory_subcategory: product.accessory_subcategory || "none",
      colors: productColors?.map(c => ({ id: c.id, color_name: c.color_name, color_code: c.color_code || "" })) || [],
      has_color_options: product.has_color_options || false,
      has_part_type_options: product.has_part_type_options || false,
      part_types: productPartTypes?.map(pt => ({ id: pt.id, part_type_name: pt.part_type_name })) || [],
    });
    setImageFiles([]);
    setImagePreviews([]);
    setIsDialogOpen(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setImageFiles(prev => [...prev, ...files]);
      
      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeNewImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExistingImage = (index: number) => {
    setFormData({ ...formData, images: formData.images.filter((_, i) => i !== index) });
  };

  const handleDeleteProduct = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteMutation.mutate(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingProduct(null);
      resetForm();
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <Card>
        <CardHeader className="flex flex-col gap-4 p-3 md:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="text-lg md:text-2xl">Product Management</CardTitle>
          </div>
          
          {/* Styled Category Tabs */}
          <div className="flex justify-center animate-scale-in">
            <Tabs value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setAccessorySubFilter("all"); }}>
              <TabsList className="h-10 items-center justify-center rounded-md bg-muted text-muted-foreground grid w-full max-w-2xl grid-cols-5 p-1 glass-effect shadow-xl border-primary/20">
                {CATEGORY_FILTERS.map((filter) => {
                  const Icon = filter.icon;
                  return (
                    <TabsTrigger
                      key={filter.value}
                      value={filter.value}
                      className="gap-1 text-xs md:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300"
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{filter.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          </div>

          {/* Accessory Subcategory Tabs */}
          {categoryFilter === "accessories" && (
            <div className="flex justify-center animate-scale-in">
              <Tabs value={accessorySubFilter} onValueChange={setAccessorySubFilter}>
                <TabsList className="h-9 items-center justify-center rounded-md bg-muted/50 text-muted-foreground grid w-full max-w-lg grid-cols-5 p-1">
                  {ACCESSORY_SUB_FILTERS.map((sub) => (
                    <TabsTrigger
                      key={sub.value}
                      value={sub.value}
                      className="text-xs data-[state=active]:bg-accent data-[state=active]:text-white transition-all duration-300"
                    >
                      {sub.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          )}
          <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button size="sm" className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-2 md:mx-auto w-[95vw] md:w-full">
              <DialogHeader>
                <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createOrUpdateMutation.mutate(formData); }} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Product Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="brand">Brand *</Label>
                    <Input
                      id="brand"
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value, accessory_subcategory: "" })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Show accessory subcategory only for Accessories category */}
                {categories?.find(c => c.id === formData.category_id)?.name === "Accessories" && (
                  <div>
                    <Label htmlFor="accessory_subcategory">Accessory Subcategory</Label>
                    <Select 
                      value={formData.accessory_subcategory} 
                      onValueChange={(value) => setFormData({ ...formData, accessory_subcategory: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select subcategory" />
                      </SelectTrigger>
                      <SelectContent>
                        {ACCESSORY_SUBCATEGORIES.map((sub) => (
                          <SelectItem key={sub.value} value={sub.value}>{sub.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="price">Retail Price (Rs.) *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="wholesale_price">Wholesale Price (Rs.)</Label>
                    <Input
                      id="wholesale_price"
                      type="number"
                      step="0.01"
                      value={formData.wholesale_price}
                      onChange={(e) => setFormData({ ...formData, wholesale_price: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="stock">Stock *</Label>
                    <Input
                      id="stock"
                      type="number"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Product Images</Label>
                  
                  {/* Existing images */}
                  {formData.images.filter(img => img).length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-muted-foreground mb-2">Existing Images:</p>
                      <div className="grid grid-cols-3 gap-2">
                        {formData.images.filter(img => img).map((img, idx) => (
                          <div key={idx} className="relative group">
                            <img 
                              src={img} 
                              alt={`Product ${idx + 1}`} 
                              className="w-full h-24 object-cover rounded border"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                              onClick={() => handleRemoveExistingImage(idx)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* New image previews */}
                  {imagePreviews.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-muted-foreground mb-2">New Images to Upload:</p>
                      <div className="grid grid-cols-3 gap-2">
                        {imagePreviews.map((preview, idx) => (
                          <div key={idx} className="relative group">
                            <img 
                              src={preview} 
                              alt={`New ${idx + 1}`} 
                              className="w-full h-24 object-cover rounded border"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                              onClick={() => removeNewImage(idx)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* File upload input */}
                  <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                    <Input
                      id="image-upload"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      multiple
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <label 
                      htmlFor="image-upload" 
                      className="cursor-pointer flex flex-col items-center gap-2"
                    >
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Click to upload images</p>
                        <p className="text-xs text-muted-foreground">JPG, PNG, WEBP (multiple images supported)</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="availability">Availability Status</Label>
                    <Select 
                      value={formData.availability_status} 
                      onValueChange={(value) => setFormData({ ...formData, availability_status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="coming_soon">Coming Soon</SelectItem>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="discount">Discount Percentage</Label>
                    <Input
                      id="discount"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.discount_percentage}
                      onChange={(e) => setFormData({ ...formData, discount_percentage: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="featured"
                      checked={formData.featured}
                      onCheckedChange={(checked) => setFormData({ ...formData, featured: checked as boolean })}
                    />
                    <Label htmlFor="featured" className="cursor-pointer">Mark as Featured Product</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="on_sale"
                      checked={formData.on_sale}
                      onCheckedChange={(checked) => setFormData({ ...formData, on_sale: checked as boolean })}
                    />
                    <Label htmlFor="on_sale" className="cursor-pointer">Mark as On Sale (Flash Sale)</Label>
                  </div>

                  {formData.on_sale && (
                    <div>
                      <Label htmlFor="sale_price">Sale Price (Rs.) *</Label>
                      <Input
                        id="sale_price"
                        type="number"
                        step="0.01"
                        value={formData.sale_price}
                        onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                        placeholder="Enter sale price"
                      />
                    </div>
                  )}
                </div>

{/* Variant Options */}
                <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
                  <h4 className="font-semibold text-sm">Product Variant Options</h4>
                  
                  {/* Color Options Toggle */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="has_color_options"
                        checked={formData.has_color_options}
                        onCheckedChange={(checked) => setFormData({ ...formData, has_color_options: checked as boolean })}
                      />
                      <Label htmlFor="has_color_options" className="cursor-pointer">Enable Color Selection</Label>
                    </div>
                    
                    {formData.has_color_options && (
                      <div className="pl-6 space-y-3">
                        {/* Existing colors */}
                        {formData.colors.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {formData.colors.map((color, idx) => (
                              <div 
                                key={idx} 
                                className="flex items-center gap-2 bg-background px-3 py-1.5 rounded-full border"
                              >
                                <div 
                                  className="w-4 h-4 rounded-full border border-border"
                                  style={{ backgroundColor: color.color_code || '#ccc' }}
                                />
                                <span className="text-sm">{color.color_name}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0 hover:bg-destructive/20"
                                  onClick={() => setFormData({
                                    ...formData,
                                    colors: formData.colors.filter((_, i) => i !== idx)
                                  })}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Add new color */}
                        <div className="flex gap-2 items-end">
                          <div className="flex-1">
                            <Label className="text-xs text-muted-foreground">Color Name</Label>
                            <Input
                              placeholder="e.g., Midnight Black"
                              value={newColor.color_name}
                              onChange={(e) => setNewColor({ ...newColor, color_name: e.target.value })}
                            />
                          </div>
                          <div className="w-20">
                            <Label className="text-xs text-muted-foreground">Color</Label>
                            <Input
                              type="color"
                              value={newColor.color_code}
                              onChange={(e) => setNewColor({ ...newColor, color_code: e.target.value })}
                              className="h-10 p-1 cursor-pointer"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (newColor.color_name.trim()) {
                                setFormData({
                                  ...formData,
                                  colors: [...formData.colors, { ...newColor }]
                                });
                                setNewColor({ color_name: "", color_code: "#000000" });
                              }
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Part Type Options Toggle */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="has_part_type_options"
                        checked={formData.has_part_type_options}
                        onCheckedChange={(checked) => setFormData({ ...formData, has_part_type_options: checked as boolean })}
                      />
                      <Label htmlFor="has_part_type_options" className="cursor-pointer">Enable Part Type Selection (for spare parts)</Label>
                    </div>
                    
                    {formData.has_part_type_options && (
                      <div className="pl-6 space-y-3">
                        {/* Existing part types */}
                        {formData.part_types.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {formData.part_types.map((pt, idx) => (
                              <div 
                                key={idx} 
                                className="flex items-center gap-2 bg-background px-3 py-1.5 rounded-full border"
                              >
                                <Wrench className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm">{pt.part_type_name}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0 hover:bg-destructive/20"
                                  onClick={() => setFormData({
                                    ...formData,
                                    part_types: formData.part_types.filter((_, i) => i !== idx)
                                  })}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Add new part type */}
                        <div className="flex gap-2 items-end">
                          <div className="flex-1">
                            <Label className="text-xs text-muted-foreground">Part Type Name</Label>
                            <Input
                              placeholder="e.g., Display, Battery, Charging Port"
                              value={newPartType}
                              onChange={(e) => setNewPartType(e.target.value)}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (newPartType.trim()) {
                                setFormData({
                                  ...formData,
                                  part_types: [...formData.part_types, { part_type_name: newPartType.trim() }]
                                });
                                setNewPartType("");
                              }
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={createOrUpdateMutation.isPending || uploadingImages}>
                  {uploadingImages ? "Uploading Images..." : editingProduct ? "Update Product" : "Create Product"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-3 md:p-6">
          {(() => {
            const filteredProducts = products?.filter((product) => {
              const categoryName = product.categories?.name?.toLowerCase() || "";
              
              // Category filter
              if (categoryFilter !== "all") {
                if (categoryFilter === "phones" && !(categoryName === "phones" || categoryName === "phone")) return false;
                if (categoryFilter === "used-phones" && !(categoryName === "used phones" || categoryName === "used-phones")) return false;
                if (categoryFilter === "laptops" && !(categoryName === "laptops" || categoryName === "laptop")) return false;
                if (categoryFilter === "accessories" && !(categoryName === "accessories" || categoryName === "accessory")) return false;
              }
              
              // Accessory subcategory filter
              if (categoryFilter === "accessories" && accessorySubFilter !== "all") {
                if (product.accessory_subcategory !== accessorySubFilter) return false;
              }
              
              return true;
            });
            
            return filteredProducts && filteredProducts.length === 0 ? (
              <div className="text-center py-8 md:py-12">
                <Package className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg md:text-xl mb-4">No products found</p>
                <p className="text-sm text-muted-foreground mb-6">
                  {categoryFilter === "all" ? "Add your first product to get started" : `No products in "${CATEGORY_FILTERS.find(f => f.value === categoryFilter)?.label}" category`}
                </p>
              </div>
            ) : (
              <>
                {/* Mobile card layout */}
                <div className="md:hidden space-y-3">
                  {filteredProducts?.map((product) => (
                  <Card key={product.id} className="border">
                    <CardContent className="p-3">
                      <div className="flex gap-3">
                        <div className="w-16 h-16 bg-secondary/20 rounded overflow-hidden flex-shrink-0">
                          {product.images?.[0] ? (
                            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.brand}</p>
                          <p className="text-sm font-medium mt-1">Rs. {product.price.toLocaleString()}</p>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            <Badge variant={product.stock > 10 ? "default" : product.stock > 0 ? "secondary" : "destructive"} className="text-xs">
                              Stock: {product.stock}
                            </Badge>
                            {product.featured && <Badge className="text-xs">Featured</Badge>}
                            {product.on_sale && <Badge className="text-xs bg-red-600">Sale</Badge>}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(product)}
                            className="h-8 w-8 p-0"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteProduct(product.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop table layout */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Brand</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts?.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-secondary/20 rounded overflow-hidden flex-shrink-0">
                              {product.images?.[0] ? (
                                <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <span className="font-medium">{product.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{product.brand}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">Rs. {product.price.toLocaleString()}</div>
                            {product.wholesale_price && (
                              <div className="text-xs text-green-600">
                                Wholesale: Rs. {product.wholesale_price.toLocaleString()}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.stock > 10 ? "default" : product.stock > 0 ? "secondary" : "destructive"}>
                            {product.stock}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {product.featured && <Badge className="mr-1">Featured</Badge>}
                          {product.on_sale && <Badge className="mr-1 bg-red-600">Flash Sale</Badge>}
                          {product.stock <= 0 && <Badge variant="destructive">Out of Stock</Badge>}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(product)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteProduct(product.id)}
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
            </>
            );
          })()}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent className="mx-2 md:mx-auto w-[95vw] md:w-full max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this product? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
