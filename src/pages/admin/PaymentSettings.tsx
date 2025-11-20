import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

export default function PaymentSettings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasRole, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    easypaisa_number: "",
    easypaisa_qr_code_url: "",
    jazzcash_number: "",
    jazzcash_qr_code_url: "",
    bank_account_name: "",
    bank_account_number: "",
    bank_name: "",
    delivery_charges: 0,
    wallet_transfer_charges: 0,
    service_fees: 0,
  });

  const isAdmin = hasRole("admin");

  const { data: settings, isLoading } = useQuery({
    queryKey: ["payment-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_settings")
        .select("*")
        .single();

      if (error) throw error;
      
      if (data) {
        setFormData({
          easypaisa_number: data.easypaisa_number || "",
          easypaisa_qr_code_url: data.easypaisa_qr_code_url || "",
          jazzcash_number: data.jazzcash_number || "",
          jazzcash_qr_code_url: data.jazzcash_qr_code_url || "",
          bank_account_name: data.bank_account_name || "",
          bank_account_number: data.bank_account_number || "",
          bank_name: data.bank_name || "",
          delivery_charges: data.delivery_charges || 0,
          wallet_transfer_charges: data.wallet_transfer_charges || 0,
          service_fees: data.service_fees || 0,
        });
      }
      
      return data;
    },
    enabled: isAdmin,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from("payment_settings")
        .update(data)
        .eq("id", settings?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-settings"] });
      toast.success("Payment settings updated successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to update settings", {
        description: error.message,
      });
    },
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    navigate("/");
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate(formData);
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payment Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure payment methods and charges for your store
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Easypaisa Configuration</CardTitle>
            <CardDescription>
              Set up Easypaisa wallet details for customer payments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="easypaisa_number">Easypaisa Wallet Number</Label>
              <Input
                id="easypaisa_number"
                value={formData.easypaisa_number}
                onChange={(e) => handleChange("easypaisa_number", e.target.value)}
                placeholder="03XX-XXXXXXX"
              />
            </div>
            <div>
              <Label htmlFor="easypaisa_qr">Easypaisa QR Code URL (Optional)</Label>
              <Input
                id="easypaisa_qr"
                value={formData.easypaisa_qr_code_url}
                onChange={(e) => handleChange("easypaisa_qr_code_url", e.target.value)}
                placeholder="https://..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>JazzCash Configuration</CardTitle>
            <CardDescription>
              Set up JazzCash wallet details for customer payments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="jazzcash_number">JazzCash Wallet Number</Label>
              <Input
                id="jazzcash_number"
                value={formData.jazzcash_number}
                onChange={(e) => handleChange("jazzcash_number", e.target.value)}
                placeholder="03XX-XXXXXXX"
              />
            </div>
            <div>
              <Label htmlFor="jazzcash_qr">JazzCash QR Code URL (Optional)</Label>
              <Input
                id="jazzcash_qr"
                value={formData.jazzcash_qr_code_url}
                onChange={(e) => handleChange("jazzcash_qr_code_url", e.target.value)}
                placeholder="https://..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bank Transfer Configuration</CardTitle>
            <CardDescription>
              Set up bank account details for customer payments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="bank_name">Bank Name</Label>
              <Input
                id="bank_name"
                value={formData.bank_name}
                onChange={(e) => handleChange("bank_name", e.target.value)}
                placeholder="Bank Name"
              />
            </div>
            <div>
              <Label htmlFor="bank_account_name">Account Title</Label>
              <Input
                id="bank_account_name"
                value={formData.bank_account_name}
                onChange={(e) => handleChange("bank_account_name", e.target.value)}
                placeholder="Account Title"
              />
            </div>
            <div>
              <Label htmlFor="bank_account_number">Account Number</Label>
              <Input
                id="bank_account_number"
                value={formData.bank_account_number}
                onChange={(e) => handleChange("bank_account_number", e.target.value)}
                placeholder="XXXX-XXXX-XXXX-XXXX"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Charges & Fees</CardTitle>
            <CardDescription>
              Configure delivery charges and service fees (in PKR)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="delivery_charges">Delivery Charges (PKR)</Label>
              <Input
                id="delivery_charges"
                type="number"
                value={formData.delivery_charges}
                onChange={(e) => handleChange("delivery_charges", parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="wallet_transfer_charges">Wallet Transfer Charges (PKR)</Label>
              <Input
                id="wallet_transfer_charges"
                type="number"
                value={formData.wallet_transfer_charges}
                onChange={(e) => handleChange("wallet_transfer_charges", parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="service_fees">Service Fees (PKR)</Label>
              <Input
                id="service_fees"
                type="number"
                value={formData.service_fees}
                onChange={(e) => handleChange("service_fees", parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          </CardContent>
        </Card>

        <Button 
          type="submit" 
          className="w-full" 
          size="lg"
          disabled={updateSettingsMutation.isPending}
        >
          {updateSettingsMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Payment Settings
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
