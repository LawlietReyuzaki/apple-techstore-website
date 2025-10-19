import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, Clock, CheckCircle, AlertCircle, Users } from "lucide-react";
import { toast } from "sonner";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error("Access denied");
      navigate("/");
    }
  }, [isAdmin, authLoading, navigate]);

  const { data: repairStats } = useQuery({
    queryKey: ["repair-stats"],
    queryFn: async () => {
      const { data: repairs, error } = await supabase
        .from("repairs")
        .select("status");

      if (error) throw error;

      return {
        total: repairs?.length || 0,
        pending: repairs?.filter(r => r.status === "created").length || 0,
        inProgress: repairs?.filter(r => r.status === "in_progress").length || 0,
        completed: repairs?.filter(r => r.status === "delivered").length || 0,
      };
    },
    enabled: isAdmin,
  });

  const { data: technicianCount } = useQuery({
    queryKey: ["technician-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("technicians")
        .select("*", { count: "exact", head: true });

      if (error) throw error;
      return count || 0;
    },
    enabled: isAdmin,
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Dashboard Overview</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-8 animate-fade-in">
        <Card className="hover-scale transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Repairs</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{repairStats?.total || 0}</div>
          </CardContent>
        </Card>

        <Card className="hover-scale transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{repairStats?.pending || 0}</div>
          </CardContent>
        </Card>

        <Card className="hover-scale transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{repairStats?.inProgress || 0}</div>
          </CardContent>
        </Card>

        <Card className="hover-scale transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{repairStats?.completed || 0}</div>
          </CardContent>
        </Card>

        <Card className="hover-scale transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Technicians</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{technicianCount || 0}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
