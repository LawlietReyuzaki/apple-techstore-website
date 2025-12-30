import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Minus, Pencil, Trash2, X, Upload, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";

interface Variant {
  id?: string;
  variant_name: string;
  price: string;
  stock: string;
  sort_order: number;
}

export default function AdminSpareParts() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<any>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [newPartTypeName, setNewPartTypeName] = useState("");
  const [isAddTypeOpen, setIsAddTypeOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [formData, setFormData] = useState({
    phone_model_name: "",
    part_category_id: "",
    part_type_id: "",
    quality_id: "",
    name: "",
    description: "",
    price: "",
    stock: "",
    images: [""],
    visible: true,
    featured: false,
    has_color_options: false,
    colors: [{ color_name: "", color_code: "" }],
    has_variants: false,
    variants: [{ variant_name: "", price: "", stock: "", sort_order: 0 }] as Variant[],
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: spareParts = [] } = useQuery({
    queryKey: ["admin-spare-parts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("spare_parts")
        .select(`
          *,
          phone_models (name, spare_parts_brands (name)),
          part_categories (name),
          part_types (name),
          part_qualities (name),
          spare_parts_colors (color_name, color_code)
        `)
        .order("created_at", { ascending: false });
      
      // Fetch variants for each spare part
      if (data) {
        for (const part of data) {
          const { data: variants } = await supabase
            .from("spare_part_variants")
            .select("*")
            .eq("spare_part_id", part.id)
            .order("sort_order");
          (part as any).variants = variants || [];
        }
      }
      
      return data || [];
    },
  });

  const { data: partCategories = [] } = useQuery({
    queryKey: ["part-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("part_categories").select("*");
      return data || [];
    },
  });

  const { data: partTypes = [] } = useQuery({
    queryKey: ["part-types"],
    queryFn: async () => {
      const { data } = await supabase.from("part_types").select("*");
      return data || [];
    },
  });

  const { data: partQualities = [] } = useQuery({
    queryKey: ["part-qualities"],
    queryFn: async () => {
      const { data } = await supabase.from("part_qualities").select("*").order("sort_order");
      return data || [];
    },
  });

  // Mutations for inline part category management
  const addPartCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("part_categories")
        .insert([{ name }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["part-categories"] });
      toast({ title: "Part category added" });
      setNewCategoryName("");
      setIsAddCategoryOpen(false);
      setFormData(prev => ({ ...prev, part_category_id: data.id }));
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deletePartCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("part_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["part-categories"] });
      toast({ title: "Part category deleted" });
      if (formData.part_category_id) {
        setFormData({ ...formData, part_category_id: "", part_type_id: "" });
      }
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Mutations for inline part type management
  const addPartTypeMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!formData.part_category_id) {
        throw new Error("Please select a Part Category first");
      }
      const { error } = await supabase
        .from("part_types")
        .insert([{ name, category_id: formData.part_category_id }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["part-types"] });
      toast({ title: "Part type added" });
      setNewPartTypeName("");
      setIsAddTypeOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deletePartTypeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("part_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["part-types"] });
      toast({ title: "Part type deleted" });
      if (formData.part_type_id) {
        setFormData({ ...formData, part_type_id: "" });
      }
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

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

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

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
          .from('spare-parts-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('spare-parts-images')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }
      
      setUploadingImages(false);
      return uploadedUrls;
    } catch (error) {
      setUploadingImages(false);
      toast({ 
        title: "Image upload failed", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive" 
      });
      throw error;
    }
  };

  const createPartMutation = useMutation({
    mutationFn: async (data: any) => {
      const uploadedImages = await uploadImages();
      const { colors, variants, has_variants, ...partData } = data;
      partData.images = uploadedImages;
      
      // If using variants, set base price/stock to first variant or 0
      if (has_variants && variants.length > 0) {
        const minPrice = Math.min(...variants.filter((v: Variant) => v.price).map((v: Variant) => parseFloat(v.price)));
        partData.price = minPrice || 0;
        partData.stock = variants.reduce((sum: number, v: Variant) => sum + (parseInt(v.stock) || 0), 0);
      }
      
      const { data: part, error } = await supabase
        .from("spare_parts")
        .insert([partData])
        .select()
        .single();
      
      if (error) throw error;

      // Insert colors
      if (colors && colors.length > 0) {
        const colorData = colors
          .filter((c: any) => c.color_name)
          .map((c: any) => ({ ...c, spare_part_id: part.id }));
        
        if (colorData.length > 0) {
          await supabase.from("spare_parts_colors").insert(colorData);
        }
      }
      
      // Insert variants
      if (has_variants && variants && variants.length > 0) {
        const variantData = variants
          .filter((v: Variant) => v.variant_name)
          .map((v: Variant, idx: number) => ({
            spare_part_id: part.id,
            variant_name: v.variant_name,
            price: parseFloat(v.price) || 0,
            stock: parseInt(v.stock) || 0,
            sort_order: idx,
          }));
        
        if (variantData.length > 0) {
          await supabase.from("spare_part_variants").insert(variantData);
        }
      }
      
      return part;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-spare-parts"] });
      toast({ title: "Spare part created successfully" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error creating spare part", description: error.message, variant: "destructive" });
    },
  });

  const updatePartMutation = useMutation({
    mutationFn: async ({ id, data }: any) => {
      const uploadedImages = await uploadImages();
      const { colors, variants, has_variants, ...partData } = data;
      partData.images = uploadedImages;
      
      // If using variants, set base price/stock
      if (has_variants && variants.length > 0) {
        const minPrice = Math.min(...variants.filter((v: Variant) => v.price).map((v: Variant) => parseFloat(v.price)));
        partData.price = minPrice || 0;
        partData.stock = variants.reduce((sum: number, v: Variant) => sum + (parseInt(v.stock) || 0), 0);
      }
      
      await supabase.from("spare_parts").update(partData).eq("id", id);
      
      // Update colors
      await supabase.from("spare_parts_colors").delete().eq("spare_part_id", id);
      if (colors && colors.length > 0) {
        const colorData = colors
          .filter((c: any) => c.color_name)
          .map((c: any) => ({ ...c, spare_part_id: id }));
        
        if (colorData.length > 0) {
          await supabase.from("spare_parts_colors").insert(colorData);
        }
      }
      
      // Update variants
      await supabase.from("spare_part_variants").delete().eq("spare_part_id", id);
      if (has_variants && variants && variants.length > 0) {
        const variantData = variants
          .filter((v: Variant) => v.variant_name)
          .map((v: Variant, idx: number) => ({
            spare_part_id: id,
            variant_name: v.variant_name,
            price: parseFloat(v.price) || 0,
            stock: parseInt(v.stock) || 0,
            sort_order: idx,
          }));
        
        if (variantData.length > 0) {
          await supabase.from("spare_part_variants").insert(variantData);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-spare-parts"] });
      toast({ title: "Spare part updated successfully" });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error updating spare part", description: error.message, variant: "destructive" });
    },
  });

  const deletePartMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("spare_parts").delete().eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-spare-parts"] });
      toast({ title: "Spare part deleted successfully" });
    },
  });

  const resetForm = () => {
    setFormData({
      phone_model_name: "",
      part_category_id: "",
      part_type_id: "",
      quality_id: "",
      name: "",
      description: "",
      price: "",
      stock: "",
      images: [""],
      visible: true,
      featured: false,
      has_color_options: false,
      colors: [{ color_name: "", color_code: "" }],
      has_variants: false,
      variants: [{ variant_name: "", price: "", stock: "", sort_order: 0 }],
    });
    setEditingPart(null);
    setImageFiles([]);
    setImagePreviews([]);
  };

  const handleSubmit = () => {
    // Validate variants if enabled
    if (formData.has_variants) {
      const validVariants = formData.variants.filter(v => v.variant_name.trim());
      if (validVariants.length === 0) {
        toast({ title: "Add at least one variant", variant: "destructive" });
        return;
      }
    }
    
    const submitData = {
      phone_model_name: formData.phone_model_name,
      phone_model_id: null,
      part_category_id: formData.part_category_id,
      part_type_id: formData.part_type_id || null,
      quality_id: formData.quality_id || null,
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price) || 0,
      stock: parseInt(formData.stock) || 0,
      images: formData.images.filter(img => img),
      visible: formData.visible,
      featured: formData.featured,
      has_color_options: formData.has_color_options,
      colors: formData.colors,
      has_variants: formData.has_variants,
      variants: formData.variants,
    };

    if (editingPart) {
      updatePartMutation.mutate({ id: editingPart.id, data: submitData });
    } else {
      createPartMutation.mutate(submitData);
    }
  };

  const handleEdit = (part: any) => {
    setEditingPart(part);
    const hasVariants = part.variants && part.variants.length > 0;
    setFormData({
      phone_model_name: part.phone_model_name || (part.phone_models ? `${part.phone_models.spare_parts_brands?.name || ''} ${part.phone_models.name}`.trim() : ""),
      part_category_id: part.part_category_id,
      part_type_id: part.part_type_id || "",
      quality_id: part.quality_id || "",
      name: part.name,
      description: part.description || "",
      price: part.price.toString(),
      stock: part.stock.toString(),
      images: part.images.length > 0 ? part.images : [""],
      visible: part.visible,
      featured: part.featured,
      has_color_options: part.has_color_options || false,
      colors: part.spare_parts_colors.length > 0 
        ? part.spare_parts_colors 
        : [{ color_name: "", color_code: "" }],
      has_variants: hasVariants,
      variants: hasVariants 
        ? part.variants.map((v: any) => ({ 
            id: v.id,
            variant_name: v.variant_name, 
            price: v.price.toString(), 
            stock: v.stock.toString(),
            sort_order: v.sort_order 
          }))
        : [{ variant_name: "", price: "", stock: "", sort_order: 0 }],
    });
    setImageFiles([]);
    setImagePreviews([]);
    setIsDialogOpen(true);
  };

  const addVariant = () => {
    setFormData({
      ...formData,
      variants: [...formData.variants, { variant_name: "", price: "", stock: "", sort_order: formData.variants.length }],
    });
  };

  const removeVariant = (index: number) => {
    if (formData.variants.length > 1) {
      setFormData({
        ...formData,
        variants: formData.variants.filter((_, i) => i !== index),
      });
    }
  };

  const updateVariant = (index: number, field: keyof Variant, value: string) => {
    const newVariants = [...formData.variants];
    (newVariants[index] as any)[field] = value;
    setFormData({ ...formData, variants: newVariants });
  };

  return (
    <div className="p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Spare Parts Management</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Add Spare Part
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingPart ? "Edit" : "Add"} Spare Part</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Phone Model</label>
                  <Input
                    placeholder="Enter phone model (e.g., iPhone 15 Pro Max, Samsung Galaxy S24)"
                    value={formData.phone_model_name}
                    onChange={(e) => setFormData({...formData, phone_model_name: e.target.value})}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Part Category</label>
                  <div className="flex items-center gap-2">
                    <Select value={formData.part_category_id} onValueChange={(v) => setFormData({...formData, part_category_id: v, part_type_id: ""})}>
                      <SelectTrigger className="bg-background flex-1">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {partCategories.map((cat: any) => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Popover open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" size="icon" title="Add new part category">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 bg-background z-50" align="end">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">New Part Category</label>
                          <Input
                            placeholder="Category name"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                          />
                          <Button 
                            size="sm" 
                            className="w-full"
                            onClick={() => addPartCategoryMutation.mutate(newCategoryName)}
                            disabled={!newCategoryName.trim() || addPartCategoryMutation.isPending}
                          >
                            Add
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>

                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon"
                      disabled={!formData.part_category_id}
                      title={!formData.part_category_id ? "Select a category to delete" : "Delete selected category"}
                      onClick={() => {
                        if (formData.part_category_id && confirm("Delete this category? This will also delete all associated part types.")) {
                          deletePartCategoryMutation.mutate(formData.part_category_id);
                        }
                      }}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Part Type (Optional)</label>
                  <div className="flex items-center gap-2">
                    <Select value={formData.part_type_id} onValueChange={(v) => setFormData({...formData, part_type_id: v})}>
                      <SelectTrigger className="bg-background flex-1">
                        <SelectValue placeholder="Select Type" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {partTypes
                          .filter((type: any) => type.category_id === formData.part_category_id)
                          .map((type: any) => (
                            <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    
                    <Popover open={isAddTypeOpen} onOpenChange={setIsAddTypeOpen}>
                      <PopoverTrigger asChild>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="icon"
                          disabled={!formData.part_category_id}
                          title={!formData.part_category_id ? "Select a category first" : "Add new part type"}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 bg-background z-50" align="end">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">New Part Type</label>
                          <Input
                            placeholder="Type name"
                            value={newPartTypeName}
                            onChange={(e) => setNewPartTypeName(e.target.value)}
                          />
                          <Button 
                            size="sm" 
                            className="w-full"
                            onClick={() => addPartTypeMutation.mutate(newPartTypeName)}
                            disabled={!newPartTypeName.trim() || addPartTypeMutation.isPending}
                          >
                            Add
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>

                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon"
                      disabled={!formData.part_type_id}
                      title={!formData.part_type_id ? "Select a part type to delete" : "Delete selected part type"}
                      onClick={() => {
                        if (formData.part_type_id && confirm("Delete this part type?")) {
                          deletePartTypeMutation.mutate(formData.part_type_id);
                        }
                      }}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Quality (Optional)</label>
                  <Select value={formData.quality_id} onValueChange={(v) => setFormData({...formData, quality_id: v})}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select Quality" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {partQualities.map((quality: any) => (
                        <SelectItem key={quality.id} value={quality.id}>{quality.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Input
                  placeholder="Part Name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />

                <Textarea
                  placeholder="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />

                {/* Variants Section */}
                <div className="space-y-3 border rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.has_variants}
                      onCheckedChange={(v) => setFormData({...formData, has_variants: v})}
                    />
                    <Label className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Enable Variants (Different prices/stock for options like Original, Copy A, Copy B)
                    </Label>
                  </div>
                  
                  {formData.has_variants ? (
                    <div className="space-y-3 mt-3">
                      <p className="text-sm text-muted-foreground">
                        Add variants with different prices and stock. The base price shown to customers will be the lowest variant price.
                      </p>
                      {formData.variants.map((variant, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
                          <div className="flex-1 grid grid-cols-3 gap-2">
                            <Input
                              placeholder="Variant Name (e.g., Original)"
                              value={variant.variant_name}
                              onChange={(e) => updateVariant(idx, 'variant_name', e.target.value)}
                            />
                            <Input
                              type="number"
                              placeholder="Price (PKR)"
                              value={variant.price}
                              onChange={(e) => updateVariant(idx, 'price', e.target.value)}
                            />
                            <Input
                              type="number"
                              placeholder="Stock"
                              value={variant.stock}
                              onChange={(e) => updateVariant(idx, 'stock', e.target.value)}
                            />
                          </div>
                          {formData.variants.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeVariant(idx)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                        <Plus className="h-4 w-4 mr-1" /> Add Variant
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div>
                        <Label>Price (PKR)</Label>
                        <Input
                          type="number"
                          placeholder="Price"
                          value={formData.price}
                          onChange={(e) => setFormData({...formData, price: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label>Stock</Label>
                        <Input
                          type="number"
                          placeholder="Stock"
                          value={formData.stock}
                          onChange={(e) => setFormData({...formData, stock: e.target.value})}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Product Images</label>
                  
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
                              onClick={() => {
                                const newImages = formData.images.filter((_, i) => i !== idx);
                                setFormData({...formData, images: newImages.length > 0 ? newImages : [""]});
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
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
                              onClick={() => removeImage(idx)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
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
                        <p className="text-xs text-muted-foreground">JPG, PNG, WEBP (max 3 images)</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.has_color_options}
                      onCheckedChange={(v) => setFormData({...formData, has_color_options: v})}
                    />
                    <label className="text-sm font-medium">Enable Color Selection</label>
                  </div>
                  
                  {formData.has_color_options && (
                    <div className="pl-4 border-l-2 border-primary/30">
                      <label className="text-sm font-medium mb-2 block">Available Colors</label>
                      {formData.colors.map((color, idx) => (
                        <div key={idx} className="flex items-center gap-2 mb-2">
                          <Input
                            placeholder="Color Name"
                            value={color.color_name}
                            onChange={(e) => {
                              const newColors = [...formData.colors];
                              newColors[idx].color_name = e.target.value;
                              setFormData({...formData, colors: newColors});
                            }}
                            className="flex-1"
                          />
                          <Input
                            type="color"
                            value={color.color_code || "#000000"}
                            onChange={(e) => {
                              const newColors = [...formData.colors];
                              newColors[idx].color_code = e.target.value;
                              setFormData({...formData, colors: newColors});
                            }}
                            className="w-16"
                          />
                          {formData.colors.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const newColors = formData.colors.filter((_, i) => i !== idx);
                                setFormData({...formData, colors: newColors});
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setFormData({...formData, colors: [...formData.colors, { color_name: "", color_code: "" }]})}
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add Color
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.visible}
                      onCheckedChange={(v) => setFormData({...formData, visible: v})}
                    />
                    <label className="text-sm">Visible</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formData.featured}
                      onCheckedChange={(v) => setFormData({...formData, featured: v})}
                    />
                    <label className="text-sm">Featured</label>
                  </div>
                </div>

                <Button onClick={handleSubmit} className="w-full" disabled={uploadingImages}>
                  {uploadingImages ? "Uploading Images..." : editingPart ? "Update" : "Create"} Spare Part
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Variants</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {spareParts.map((part: any) => (
                <TableRow key={part.id}>
                  <TableCell>{part.name}</TableCell>
                  <TableCell>
                    {part.phone_model_name || (part.phone_models ? `${part.phone_models.spare_parts_brands?.name || ''} ${part.phone_models.name}`.trim() : '-')}
                  </TableCell>
                  <TableCell>{part.part_categories?.name || '-'}</TableCell>
                  <TableCell>
                    {part.variants && part.variants.length > 0 ? (
                      <span className="text-muted-foreground">
                        From PKR {Math.min(...part.variants.map((v: any) => v.price)).toLocaleString()}
                      </span>
                    ) : (
                      `PKR ${part.price.toLocaleString()}`
                    )}
                  </TableCell>
                  <TableCell>{part.stock}</TableCell>
                  <TableCell>
                    {part.variants && part.variants.length > 0 ? (
                      <Badge variant="secondary" className="gap-1">
                        <Package className="h-3 w-3" />
                        {part.variants.length}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={part.visible ? "default" : "secondary"}>
                      {part.visible ? "Visible" : "Hidden"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(part)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deletePartMutation.mutate(part.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}