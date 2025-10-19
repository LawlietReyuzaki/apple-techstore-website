import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Shield, UserCog } from "lucide-react";
import type { AppRole } from "@/hooks/useAuth";

export default function AdminSettings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error("Access denied");
      navigate("/");
    }
  }, [isAdmin, authLoading, navigate]);

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

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
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
    </div>
  );
}
