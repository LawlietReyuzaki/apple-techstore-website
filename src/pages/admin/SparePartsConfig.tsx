import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminSparePartsConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [brandDialog, setBrandDialog] = useState(false);
  const [modelDialog, setModelDialog] = useState(false);
  const [typeDialog, setTypeDialog] = useState(false);

  const [brandForm, setBrandForm] = useState({ phone_category_id: "", name: "" });
  const [modelForm, setModelForm] = useState({ brand_id: "", name: "" });
  const [typeForm, setTypeForm] = useState({ category_id: "", name: "" });

  const { data: phoneCategories = [] } = useQuery({
    queryKey: ["phone-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("phone_categories").select("*");
      return data || [];
    },
  });

  const { data: brands = [] } = useQuery({
    queryKey: ["spare-parts-brands"],
    queryFn: async () => {
      const { data } = await supabase
        .from("spare_parts_brands")
        .select("*, phone_categories (name)");
      return data || [];
    },
  });

  const { data: models = [] } = useQuery({
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
      const { data } = await supabase
        .from("part_types")
        .select("*, part_categories (name)");
      return data || [];
    },
  });

  const createBrand = useMutation({
    mutationFn: async (data: any) => {
      await supabase.from("spare_parts_brands").insert([data]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spare-parts-brands"] });
      toast({ title: "Brand created successfully" });
      setBrandDialog(false);
      setBrandForm({ phone_category_id: "", name: "" });
    },
  });

  const createModel = useMutation({
    mutationFn: async (data: any) => {
      await supabase.from("phone_models").insert([data]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phone-models"] });
      toast({ title: "Model created successfully" });
      setModelDialog(false);
      setModelForm({ brand_id: "", name: "" });
    },
  });

  const createPartType = useMutation({
    mutationFn: async (data: any) => {
      await supabase.from("part_types").insert([data]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["part-types"] });
      toast({ title: "Part type created successfully" });
      setTypeDialog(false);
      setTypeForm({ category_id: "", name: "" });
    },
  });

  const deleteBrand = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("spare_parts_brands").delete().eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spare-parts-brands"] });
      toast({ title: "Brand deleted" });
    },
  });

  const deleteModel = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("phone_models").delete().eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phone-models"] });
      toast({ title: "Model deleted" });
    },
  });

  const deletePartType = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("part_types").delete().eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["part-types"] });
      toast({ title: "Part type deleted" });
    },
  });

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Spare Parts Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="brands">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="brands">Brands</TabsTrigger>
              <TabsTrigger value="models">Models</TabsTrigger>
              <TabsTrigger value="types">Part Types</TabsTrigger>
            </TabsList>

            <TabsContent value="brands" className="space-y-4">
              <Dialog open={brandDialog} onOpenChange={setBrandDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Brand
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Brand</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Select
                      value={brandForm.phone_category_id}
                      onValueChange={(v) => setBrandForm({...brandForm, phone_category_id: v})}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select Phone Category" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {phoneCategories.map((cat: any) => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Brand Name"
                      value={brandForm.name}
                      onChange={(e) => setBrandForm({...brandForm, name: e.target.value})}
                    />
                    <Button onClick={() => createBrand.mutate(brandForm)} className="w-full">
                      Create Brand
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Brand Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {brands.map((brand: any) => (
                    <TableRow key={brand.id}>
                      <TableCell>{brand.name}</TableCell>
                      <TableCell>{brand.phone_categories.name}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteBrand.mutate(brand.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="models" className="space-y-4">
              <Dialog open={modelDialog} onOpenChange={setModelDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Model
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Phone Model</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Select
                      value={modelForm.brand_id}
                      onValueChange={(v) => setModelForm({...modelForm, brand_id: v})}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select Brand" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {brands.map((brand: any) => (
                          <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Model Name"
                      value={modelForm.name}
                      onChange={(e) => setModelForm({...modelForm, name: e.target.value})}
                    />
                    <Button onClick={() => createModel.mutate(modelForm)} className="w-full">
                      Create Model
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model Name</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {models.map((model: any) => (
                    <TableRow key={model.id}>
                      <TableCell>{model.name}</TableCell>
                      <TableCell>{model.spare_parts_brands.name}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteModel.mutate(model.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="types" className="space-y-4">
              <Dialog open={typeDialog} onOpenChange={setTypeDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Part Type
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Part Type</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Select
                      value={typeForm.category_id}
                      onValueChange={(v) => setTypeForm({...typeForm, category_id: v})}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select Part Category" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {partCategories.map((cat: any) => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Type Name (e.g., Amoled, IPS)"
                      value={typeForm.name}
                      onChange={(e) => setTypeForm({...typeForm, name: e.target.value})}
                    />
                    <Button onClick={() => createPartType.mutate(typeForm)} className="w-full">
                      Create Part Type
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partTypes.map((type: any) => (
                    <TableRow key={type.id}>
                      <TableCell>{type.name}</TableCell>
                      <TableCell>{type.part_categories.name}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deletePartType.mutate(type.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
