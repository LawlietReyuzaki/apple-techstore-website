import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wrench, Clock, CheckCircle, AlertCircle, Mail, Package } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, isPast } from "date-fns";

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

  const { data: pendingOrders } = useQuery({
    queryKey: ["pending-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .in("status", ["pending", "processing", "packed", "shipped"])
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
    refetchInterval: 30000, // Refresh every 30 seconds for timer updates
  });

  const { data: pendingRepairs } = useQuery({
    queryKey: ["pending-repairs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("repairs")
        .select("*")
        .in("status", ["created", "in_progress"])
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
    refetchInterval: 30000, // Refresh every 30 seconds for timer updates
  });

  const queryClient = useQueryClient();

  const completeOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from("orders")
        .update({ status: "delivered" })
        .eq("id", orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Order marked as complete");
      queryClient.invalidateQueries({ queryKey: ["pending-orders"] });
      queryClient.invalidateQueries({ queryKey: ["repair-stats"] });
    },
    onError: () => {
      toast.error("Failed to complete order");
    },
  });

  const completeRepairMutation = useMutation({
    mutationFn: async (repairId: string) => {
      const { error } = await supabase
        .from("repairs")
        .update({ status: "delivered" })
        .eq("id", repairId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Repair marked as complete");
      queryClient.invalidateQueries({ queryKey: ["pending-repairs"] });
      queryClient.invalidateQueries({ queryKey: ["repair-stats"] });
    },
    onError: () => {
      toast.error("Failed to complete repair");
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async ({ email, name, type }: { email: string; name: string; type: string }) => {
      const { error } = await supabase.functions.invoke("send-order-email", {
        body: {
          to: email,
          subject: `Your ${type} is Ready for Pickup`,
          customerName: name,
          message: `Please call us or visit our shop to receive your ${type}.`,
        },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Email sent to customer");
    },
    onError: () => {
      toast.error("Failed to send email");
    },
  });

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getTimeStatus = (createdAt: string) => {
    const created = new Date(createdAt);
    const hoursPassed = (currentTime.getTime() - created.getTime()) / (1000 * 60 * 60);
    const dueDate = new Date(created);
    dueDate.setHours(dueDate.getHours() + 48); // 48 hour deadline
    
    const isLate = isPast(dueDate);
    const timeLeft = formatDistanceToNow(dueDate, { addSuffix: true });

    return { isLate, timeLeft, dueDate };
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <h1 className="text-xl md:text-3xl font-bold mb-4 md:mb-8">Dashboard Overview</h1>

      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4 mb-6 md:mb-8 animate-fade-in">
        <Card className="hover-scale transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Total Repairs</CardTitle>
            <Wrench className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-lg md:text-2xl font-bold">{repairStats?.total || 0}</div>
          </CardContent>
        </Card>

        <Card className="hover-scale transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Pending</CardTitle>
            <Clock className="h-3 w-3 md:h-4 md:w-4 text-yellow-500" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-lg md:text-2xl font-bold">{repairStats?.pending || 0}</div>
          </CardContent>
        </Card>

        <Card className="hover-scale transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">In Progress</CardTitle>
            <AlertCircle className="h-3 w-3 md:h-4 md:w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-lg md:text-2xl font-bold">{repairStats?.inProgress || 0}</div>
          </CardContent>
        </Card>

        <Card className="hover-scale transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 md:p-6 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-500" />
          </CardHeader>
          <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
            <div className="text-lg md:text-2xl font-bold">{repairStats?.completed || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Product Orders */}
      <div className="mb-6 md:mb-8">
        <h2 className="text-lg md:text-2xl font-bold mb-3 md:mb-4 flex items-center gap-2">
          <Package className="h-5 w-5 md:h-6 md:w-6" />
          Pending Product Orders
        </h2>
        <div className="grid gap-3 md:gap-4">
          {pendingOrders && pendingOrders.length > 0 ? (
            pendingOrders.map((order) => {
              const { isLate, timeLeft, dueDate } = getTimeStatus(order.created_at!);
              return (
                <Card key={order.id} className={`${isLate ? "border-red-500 border-2" : ""}`}>
                  <CardContent className="p-3 md:p-6">
                    <div className="flex flex-col gap-3 md:gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="font-bold text-base md:text-lg">{order.customer_name}</h3>
                          {isLate && (
                            <span className="text-red-500 text-xs md:text-sm font-semibold animate-pulse">
                              OVERDUE
                            </span>
                          )}
                        </div>
                        <p className="text-xs md:text-sm text-muted-foreground">Order ID: {order.id.slice(0, 8)}</p>
                        <p className="text-xs md:text-sm text-muted-foreground">Phone: {order.customer_phone}</p>
                        <p className="text-xs md:text-sm text-muted-foreground truncate">Email: {order.customer_email}</p>
                        <p className="text-xs md:text-sm text-muted-foreground">Status: {order.status}</p>
                        <div className="mt-2">
                          <p className="text-xs md:text-sm">
                            <span className="font-semibold">Due:</span>{" "}
                            {dueDate.toLocaleDateString()}
                          </p>
                          <p className={`text-xs md:text-sm font-semibold ${isLate ? "text-red-500" : "text-green-500"}`}>
                            {isLate ? "Overdue" : "Due"} {timeLeft}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-row md:flex-col gap-2">
                        <Button
                          onClick={() => completeOrderMutation.mutate(order.id)}
                          disabled={completeOrderMutation.isPending}
                          className="flex-1 md:w-full text-xs md:text-sm h-9 md:h-10"
                          size="sm"
                        >
                          <CheckCircle className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                          Complete
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 md:w-full text-xs md:text-sm h-9 md:h-10"
                          onClick={() =>
                            sendEmailMutation.mutate({
                              email: order.customer_email || "",
                              name: order.customer_name,
                              type: "order",
                            })
                          }
                          disabled={sendEmailMutation.isPending || !order.customer_email}
                        >
                          <Mail className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                          Email
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card>
              <CardContent className="p-4 md:p-6 text-center text-muted-foreground text-sm">
                No pending orders
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Pending Repairs */}
      <div className="mb-6 md:mb-8">
        <h2 className="text-lg md:text-2xl font-bold mb-3 md:mb-4 flex items-center gap-2">
          <Wrench className="h-5 w-5 md:h-6 md:w-6" />
          Pending Repairs
        </h2>
        <div className="grid gap-3 md:gap-4">
          {pendingRepairs && pendingRepairs.length > 0 ? (
            pendingRepairs.map((repair) => {
              const { isLate, timeLeft, dueDate } = getTimeStatus(repair.created_at);
              return (
                <Card key={repair.id} className={`${isLate ? "border-red-500 border-2" : ""}`}>
                  <CardContent className="p-3 md:p-6">
                    <div className="flex flex-col gap-3 md:gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="font-bold text-base md:text-lg">{repair.customer_name}</h3>
                          {isLate && (
                            <span className="text-red-500 text-xs md:text-sm font-semibold animate-pulse">
                              OVERDUE
                            </span>
                          )}
                        </div>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          Tracking: {repair.tracking_code}
                        </p>
                        <p className="text-xs md:text-sm text-muted-foreground">Phone: {repair.customer_phone}</p>
                        <p className="text-xs md:text-sm text-muted-foreground truncate">Email: {repair.customer_email}</p>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          Device: {repair.device_make} {repair.device_model}
                        </p>
                        <p className="text-xs md:text-sm text-muted-foreground truncate">Issue: {repair.issue}</p>
                        <p className="text-xs md:text-sm text-muted-foreground">Status: {repair.status}</p>
                        <div className="mt-2">
                          <p className="text-xs md:text-sm">
                            <span className="font-semibold">Due:</span>{" "}
                            {dueDate.toLocaleDateString()}
                          </p>
                          <p className={`text-xs md:text-sm font-semibold ${isLate ? "text-red-500" : "text-green-500"}`}>
                            {isLate ? "Overdue" : "Due"} {timeLeft}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-row md:flex-col gap-2">
                        <Button
                          onClick={() => completeRepairMutation.mutate(repair.id)}
                          disabled={completeRepairMutation.isPending}
                          className="flex-1 md:w-full text-xs md:text-sm h-9 md:h-10"
                          size="sm"
                        >
                          <CheckCircle className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                          Complete
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 md:w-full text-xs md:text-sm h-9 md:h-10"
                          onClick={() =>
                            sendEmailMutation.mutate({
                              email: repair.customer_email || "",
                              name: repair.customer_name || "",
                              type: "repair",
                            })
                          }
                          disabled={sendEmailMutation.isPending || !repair.customer_email}
                        >
                          <Mail className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                          Email
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card>
              <CardContent className="p-4 md:p-6 text-center text-muted-foreground text-sm">
                No pending repairs
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
