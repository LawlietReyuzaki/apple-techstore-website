import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
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
import { toast } from "sonner";
import { Shield, UserCog, Wallet, Save, Loader2 } from "lucide-react";
import type { AppRole } from "@/hooks/useAuth";

export default function AdminSettings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin, loading: authLoading } = useAuth();
  
  // Payment settings state
  const [paymentFormData, setPaymentFormData] = useState({
    easypaisa_number: "",
    easypaisa_qr_code_url: "",
    jazzcash_number: "",
    jazzcash_qr_code_url: "",
    bank_account_name: "",
    bank_account_number: "",
    bank_name: "",
    iban: "",
    additional_instructions: "",
    delivery_charges: 0,
    wallet_transfer_charges: 0,
    service_fees: 0,
    enable_cod: true,
    enable_easypaisa: true,
    enable_jazzcash: true,
    enable_bank_transfer: true,
  });

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error("Access denied");
      navigate("/");
    }
  }, [isAdmin, authLoading, navigate]);

  // Fetch payment settings
  const { data: paymentSettings, isLoading: paymentSettingsLoading } = useQuery({
    queryKey: ["payment-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_settings")
        .select("*")
        .single();

      if (error) throw error;
      
      if (data) {
        setPaymentFormData({
          easypaisa_number: data.easypaisa_number || "",
          easypaisa_qr_code_url: data.easypaisa_qr_code_url || "",
          jazzcash_number: data.jazzcash_number || "",
          jazzcash_qr_code_url: data.jazzcash_qr_code_url || "",
          bank_account_name: data.bank_account_name || "",
          bank_account_number: data.bank_account_number || "",
          bank_name: data.bank_name || "",
          iban: data.iban || "",
          additional_instructions: data.additional_instructions || "",
          delivery_charges: data.delivery_charges || 0,
          wallet_transfer_charges: data.wallet_transfer_charges || 0,
          service_fees: data.service_fees || 0,
          enable_cod: data.enable_cod ?? true,
          enable_easypaisa: data.enable_easypaisa ?? true,
          enable_jazzcash: data.enable_jazzcash ?? true,
          enable_bank_transfer: data.enable_bank_transfer ?? true,
        });
      }
      
      return data;
    },
    enabled: isAdmin,
  });

  // Update payment settings mutation
  const updatePaymentSettingsMutation = useMutation({
    mutationFn: async (data: typeof paymentFormData) => {
      const { error } = await supabase
        .from("payment_settings")
        .update(data)
        .eq("id", paymentSettings?.id);

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

  // Fetch all users with their roles
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, phone, created_at")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch roles for all users
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Combine data
      return profiles?.map(profile => ({
        ...profile,
        roles: userRoles?.filter(r => r.user_id === profile.id).map(r => r.role) || [],
      }));
    },
    enabled: isAdmin,
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role, action }: { userId: string; role: AppRole; action: 'add' | 'remove' }) => {
      if (action === 'add') {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role });
        if (error) throw error;

        // If adding technician role, create technician entry
        if (role === 'technician') {
          const profile = users?.find(u => u.id === userId);
          const { data: authUser } = await supabase.auth.admin.getUserById(userId);
          
          await supabase.from("technicians").insert({
            user_id: userId,
            name: profile?.full_name || 'Technician',
            email: authUser?.user?.email || '',
            phone: profile?.phone,
          });
        }
      } else {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", role);
        if (error) throw error;

        // If removing technician role, delete technician entry
        if (role === 'technician') {
          await supabase.from("technicians").delete().eq("user_id", userId);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["technicians-list"] });
      toast.success("Role updated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update role");
    },
  });

  const getRoleBadges = (roles: AppRole[]) => {
    return roles.map(role => (
      <Badge
        key={role}
        variant={role === 'admin' ? 'default' : role === 'technician' ? 'secondary' : 'outline'}
        className="mr-1"
      >
        {role}
      </Badge>
    ));
  };

  const handlePaymentFormChange = (field: string, value: string | number | boolean) => {
    setPaymentFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePaymentFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updatePaymentSettingsMutation.mutate(paymentFormData);
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
    <div className="container mx-auto py-8 px-4">
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <UserCog className="h-4 w-4" />
            User Management
          </TabsTrigger>
          <TabsTrigger value="payment" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Payment Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            User Role Management
          </CardTitle>
          <CardDescription>
            Manage user roles and permissions. Assign admin or technician roles to users.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Current Roles</TableHead>
                <TableHead>Add Role</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name || 'N/A'}</TableCell>
                  <TableCell>{user.phone || 'N/A'}</TableCell>
                  <TableCell>
                    {user.roles.length > 0 ? getRoleBadges(user.roles as AppRole[]) : (
                      <Badge variant="outline">customer</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      onValueChange={(value) => {
                        const role = value as AppRole;
                        if (!user.roles.includes(role)) {
                          updateRoleMutation.mutate({ userId: user.id, role, action: 'add' });
                        }
                      }}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Add role" />
                      </SelectTrigger>
                      <SelectContent>
                        {!user.roles.includes('admin') && (
                          <SelectItem value="admin">Admin</SelectItem>
                        )}
                        {!user.roles.includes('technician') && (
                          <SelectItem value="technician">Technician</SelectItem>
                        )}
                        {!user.roles.includes('customer') && (
                          <SelectItem value="customer">Customer</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {user.roles.filter(r => r !== 'customer').map(role => (
                        <Button
                          key={role}
                          size="sm"
                          variant="ghost"
                          onClick={() => updateRoleMutation.mutate({ 
                            userId: user.id, 
                            role: role as AppRole, 
                            action: 'remove' 
                          })}
                        >
                          Remove {role}
                        </Button>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold">Role Hierarchy</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li><strong>Admin:</strong> Full access to all features including user management</li>
              <li><strong>Technician:</strong> Can view and update assigned repairs</li>
              <li><strong>Customer:</strong> Can view own repairs and profile</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-semibold">Security Features</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Row-Level Security (RLS) enforced on all tables</li>
              <li>Roles stored in separate table to prevent privilege escalation</li>
              <li>Security definer functions prevent recursive RLS issues</li>
              <li>All admin actions are logged in activity timeline</li>
            </ul>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="payment" className="space-y-6">
          <form onSubmit={handlePaymentFormSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Cash on Delivery (COD)</CardTitle>
                <CardDescription>
                  Enable or disable Cash on Delivery payment option
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                  <div className="space-y-0.5">
                    <Label htmlFor="enable_cod" className="text-base font-semibold">Enable Cash on Delivery</Label>
                    <p className="text-sm text-muted-foreground">Allow customers to pay cash when order is delivered</p>
                  </div>
                  <Switch
                    id="enable_cod"
                    checked={paymentFormData.enable_cod}
                    onCheckedChange={(checked) => handlePaymentFormChange("enable_cod", checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Easypaisa Configuration</CardTitle>
                <CardDescription>
                  Set up Easypaisa wallet details for customer payments
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                  <div className="space-y-0.5">
                    <Label htmlFor="enable_easypaisa" className="text-base font-semibold">Enable Easypaisa</Label>
                    <p className="text-sm text-muted-foreground">Allow customers to pay via Easypaisa</p>
                  </div>
                  <Switch
                    id="enable_easypaisa"
                    checked={paymentFormData.enable_easypaisa}
                    onCheckedChange={(checked) => handlePaymentFormChange("enable_easypaisa", checked)}
                  />
                </div>
                <div>
                  <Label htmlFor="easypaisa_number">Easypaisa Wallet Number</Label>
                  <Input
                    id="easypaisa_number"
                    value={paymentFormData.easypaisa_number}
                    onChange={(e) => handlePaymentFormChange("easypaisa_number", e.target.value)}
                    placeholder="03XX-XXXXXXX"
                    disabled={!paymentFormData.enable_easypaisa}
                  />
                </div>
                <div>
                  <Label htmlFor="easypaisa_qr">Easypaisa QR Code URL (Optional)</Label>
                  <Input
                    id="easypaisa_qr"
                    value={paymentFormData.easypaisa_qr_code_url}
                    onChange={(e) => handlePaymentFormChange("easypaisa_qr_code_url", e.target.value)}
                    placeholder="https://..."
                    disabled={!paymentFormData.enable_easypaisa}
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
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                  <div className="space-y-0.5">
                    <Label htmlFor="enable_jazzcash" className="text-base font-semibold">Enable JazzCash</Label>
                    <p className="text-sm text-muted-foreground">Allow customers to pay via JazzCash</p>
                  </div>
                  <Switch
                    id="enable_jazzcash"
                    checked={paymentFormData.enable_jazzcash}
                    onCheckedChange={(checked) => handlePaymentFormChange("enable_jazzcash", checked)}
                  />
                </div>
                <div>
                  <Label htmlFor="jazzcash_number">JazzCash Wallet Number</Label>
                  <Input
                    id="jazzcash_number"
                    value={paymentFormData.jazzcash_number}
                    onChange={(e) => handlePaymentFormChange("jazzcash_number", e.target.value)}
                    placeholder="03XX-XXXXXXX"
                    disabled={!paymentFormData.enable_jazzcash}
                  />
                </div>
                <div>
                  <Label htmlFor="jazzcash_qr">JazzCash QR Code URL (Optional)</Label>
                  <Input
                    id="jazzcash_qr"
                    value={paymentFormData.jazzcash_qr_code_url}
                    onChange={(e) => handlePaymentFormChange("jazzcash_qr_code_url", e.target.value)}
                    placeholder="https://..."
                    disabled={!paymentFormData.enable_jazzcash}
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
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                  <div className="space-y-0.5">
                    <Label htmlFor="enable_bank_transfer" className="text-base font-semibold">Enable Bank Transfer</Label>
                    <p className="text-sm text-muted-foreground">Allow customers to pay via bank transfer</p>
                  </div>
                  <Switch
                    id="enable_bank_transfer"
                    checked={paymentFormData.enable_bank_transfer}
                    onCheckedChange={(checked) => handlePaymentFormChange("enable_bank_transfer", checked)}
                  />
                </div>
                <div>
                  <Label htmlFor="bank_name">Bank Name</Label>
                  <Input
                    id="bank_name"
                    value={paymentFormData.bank_name}
                    onChange={(e) => handlePaymentFormChange("bank_name", e.target.value)}
                    placeholder="Bank Name"
                    disabled={!paymentFormData.enable_bank_transfer}
                  />
                </div>
                <div>
                  <Label htmlFor="bank_account_name">Account Title</Label>
                  <Input
                    id="bank_account_name"
                    value={paymentFormData.bank_account_name}
                    onChange={(e) => handlePaymentFormChange("bank_account_name", e.target.value)}
                    placeholder="Account Title"
                    disabled={!paymentFormData.enable_bank_transfer}
                  />
                </div>
                <div>
                  <Label htmlFor="bank_account_number">Account Number</Label>
                  <Input
                    id="bank_account_number"
                    value={paymentFormData.bank_account_number}
                    onChange={(e) => handlePaymentFormChange("bank_account_number", e.target.value)}
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    disabled={!paymentFormData.enable_bank_transfer}
                  />
                </div>
                <div>
                  <Label htmlFor="iban">IBAN (Optional)</Label>
                  <Input
                    id="iban"
                    value={paymentFormData.iban}
                    onChange={(e) => handlePaymentFormChange("iban", e.target.value)}
                    placeholder="PKXX XXXX XXXX XXXX XXXX XXXX XXXX"
                    disabled={!paymentFormData.enable_bank_transfer}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Additional Instructions</CardTitle>
                <CardDescription>
                  Optional instructions displayed to customers during payment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="additional_instructions">Instructions (Optional)</Label>
                  <Input
                    id="additional_instructions"
                    value={paymentFormData.additional_instructions}
                    onChange={(e) => handlePaymentFormChange("additional_instructions", e.target.value)}
                    placeholder="e.g., Please include your order ID in payment description"
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
                    value={paymentFormData.delivery_charges}
                    onChange={(e) => handlePaymentFormChange("delivery_charges", parseFloat(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="wallet_transfer_charges">Wallet Transfer Charges (PKR)</Label>
                  <Input
                    id="wallet_transfer_charges"
                    type="number"
                    value={paymentFormData.wallet_transfer_charges}
                    onChange={(e) => handlePaymentFormChange("wallet_transfer_charges", parseFloat(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="service_fees">Service Fees (PKR)</Label>
                  <Input
                    id="service_fees"
                    type="number"
                    value={paymentFormData.service_fees}
                    onChange={(e) => handlePaymentFormChange("service_fees", parseFloat(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
              </CardContent>
            </Card>

            <Button 
              type="submit" 
              className="w-full" 
              size="lg"
              disabled={updatePaymentSettingsMutation.isPending}
            >
              {updatePaymentSettingsMutation.isPending ? (
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
