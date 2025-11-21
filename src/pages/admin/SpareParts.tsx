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
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminSpareParts() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<any>(null);
  const [formData, setFormData] = useState({
    phone_model_id: "",
    part_category_id: "",
    part_type_id: "",
    name: "",
    description: "",
    price: "",
    stock: "",
    images: [""],
    visible: true,
    featured: false,
    colors: [{ color_name: "", color_code: "" }],
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
          spare_parts_colors (color_name, color_code)
        `)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: phoneModels = [] } = useQuery({
    queryKey: ["phone-models"],
    queryFn: async () => {
      const { data } = await supabase
        .from("phone_models")
        .select("*, spare_parts_brands (name)");
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

  const createPartMutation = useMutation({
    mutationFn: async (data: any) => {
      const { colors, ...partData } = data;
      const { data: part, error } = await supabase
        .from("spare_parts")
        .insert([partData])
        .select()
        .single();
      
      if (error) throw error;

      if (colors && colors.length > 0) {
        const colorData = colors
          .filter((c: any) => c.color_name)
          .map((c: any) => ({ ...c, spare_part_id: part.id }));
        
        if (colorData.length > 0) {
          await supabase.from("spare_parts_colors").insert(colorData);
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
  });

  const updatePartMutation = useMutation({
    mutationFn: async ({ id, data }: any) => {
      const { colors, ...partData } = data;
      await supabase.from("spare_parts").update(partData).eq("id", id);
      
      await supabase.from("spare_parts_colors").delete().eq("spare_part_id", id);
      
      if (colors && colors.length > 0) {
        const colorData = colors
          .filter((c: any) => c.color_name)
          .map((c: any) => ({ ...c, spare_part_id: id }));
        
        if (colorData.length > 0) {
          await supabase.from("spare_parts_colors").insert(colorData);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-spare-parts"] });
      toast({ title: "Spare part updated successfully" });
      setIsDialogOpen(false);
      resetForm();
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
      phone_model_id: "",
      part_category_id: "",
      part_type_id: "",
      name: "",
      description: "",
      price: "",
      stock: "",
      images: [""],
      visible: true,
      featured: false,
      colors: [{ color_name: "", color_code: "" }],
    });
    setEditingPart(null);
  };

  const handleSubmit = () => {
    const submitData = {
      phone_model_id: formData.phone_model_id,
      part_category_id: formData.part_category_id,
      part_type_id: formData.part_type_id || null,
      name: formData.name,
      description: formData.description,
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock),
      images: formData.images.filter(img => img),
      visible: formData.visible,
      featured: formData.featured,
      colors: formData.colors,
    };

    if (editingPart) {
      updatePartMutation.mutate({ id: editingPart.id, data: submitData });
    } else {
      createPartMutation.mutate(submitData);
    }
  };

  const handleEdit = (part: any) => {
    setEditingPart(part);
    setFormData({
      phone_model_id: part.phone_model_id,
      part_category_id: part.part_category_id,
      part_type_id: part.part_type_id || "",
      name: part.name,
      description: part.description || "",
      price: part.price.toString(),
      stock: part.stock.toString(),
      images: part.images.length > 0 ? part.images : [""],
      visible: part.visible,
      featured: part.featured,
      colors: part.spare_parts_colors.length > 0 
        ? part.spare_parts_colors 
        : [{ color_name: "", color_code: "" }],
    });
    setIsDialogOpen(true);
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
                  <Select value={formData.phone_model_id} onValueChange={(v) => setFormData({...formData, phone_model_id: v})}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select Model" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {phoneModels.map((model: any) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.spare_parts_brands.name} {model.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Part Category</label>
                  <Select value={formData.part_category_id} onValueChange={(v) => setFormData({...formData, part_category_id: v})}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {partCategories.map((cat: any) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Part Type (Optional)</label>
                  <Select value={formData.part_type_id} onValueChange={(v) => setFormData({...formData, part_type_id: v})}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {partTypes.map((type: any) => (
                        <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
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

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    type="number"
                    placeholder="Price (PKR)"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                  />
                  <Input
                    type="number"
                    placeholder="Stock"
                    value={formData.stock}
                    onChange={(e) => setFormData({...formData, stock: e.target.value})}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Image URLs</label>
                  {formData.images.map((img, idx) => (
                    <Input
                      key={idx}
                      placeholder="Image URL"
                      value={img}
                      onChange={(e) => {
                        const newImages = [...formData.images];
                        newImages[idx] = e.target.value;
                        setFormData({...formData, images: newImages});
                      }}
                      className="mb-2"
                    />
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData({...formData, images: [...formData.images, ""]})}
                  >
                    Add Image
                  </Button>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Colors</label>
                  {formData.colors.map((color, idx) => (
                    <div key={idx} className="grid grid-cols-2 gap-2 mb-2">
                      <Input
                        placeholder="Color Name"
                        value={color.color_name}
                        onChange={(e) => {
                          const newColors = [...formData.colors];
                          newColors[idx].color_name = e.target.value;
                          setFormData({...formData, colors: newColors});
                        }}
                      />
                      <Input
                        type="color"
                        value={color.color_code || "#000000"}
                        onChange={(e) => {
                          const newColors = [...formData.colors];
                          newColors[idx].color_code = e.target.value;
                          setFormData({...formData, colors: newColors});
                        }}
                      />
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData({...formData, colors: [...formData.colors, { color_name: "", color_code: "" }]})}
                  >
                    Add Color
                  </Button>
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

                <Button onClick={handleSubmit} className="w-full">
                  {editingPart ? "Update" : "Create"} Spare Part
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
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {spareParts.map((part: any) => (
                <TableRow key={part.id}>
                  <TableCell>{part.name}</TableCell>
                  <TableCell>
                    {part.phone_models.spare_parts_brands.name} {part.phone_models.name}
                  </TableCell>
                  <TableCell>{part.part_categories.name}</TableCell>
                  <TableCell>PKR {part.price}</TableCell>
                  <TableCell>{part.stock}</TableCell>
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
