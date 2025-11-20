import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Package, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function AccountOrders() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["user-orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          payments (
            id,
            status,
            payment_method,
            created_at
          )
        `)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const getOrderItems = async (orderId: string) => {
    const { data, error } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", orderId);

    if (error) throw error;
    return data;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      approved: "default",
      processing: "default",
      packed: "default",
      shipped: "outline",
      "out for delivery": "outline",
      delivered: "outline",
      delayed: "secondary",
      cancelled: "destructive",
    };
    const colors: Record<string, string> = {
      pending: "text-yellow-600",
      approved: "text-green-600",
      processing: "text-blue-600",
      packed: "text-blue-600",
      shipped: "text-purple-600",
      "out for delivery": "text-purple-600",
      delivered: "text-green-600",
      delayed: "text-orange-600",
      cancelled: "text-red-600",
    };
    return <Badge variant={variants[status] || "default"} className={colors[status]}>{status?.toUpperCase()}</Badge>;
  };

  const getPaymentStatusBadge = (paymentStatus: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      unpaid: "secondary",
      paid: "default",
      pending: "secondary",
      approved: "default",
      declined: "destructive",
      refunded: "outline",
    };
    const colors: Record<string, string> = {
      unpaid: "text-red-600",
      paid: "text-green-600",
      pending: "text-yellow-600",
      approved: "text-green-600",
      declined: "text-red-600",
      refunded: "text-blue-600",
    };
    return <Badge variant={variants[paymentStatus] || "default"} className={colors[paymentStatus]}>{paymentStatus?.toUpperCase()}</Badge>;
  };

  const getPaymentInstructions = (order: any) => {
    const payment = order.payments?.[0];
    
    // Payment rejected - allow resubmission
    if (order.status === "payment_rejected" || payment?.status === "declined") {
      return (
        <div className="mt-4 space-y-3">
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-sm font-medium text-red-800 dark:text-red-200">
              ❌ Payment Declined – Please upload again
            </p>
            {payment?.decline_reason && (
              <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                Reason: {payment.decline_reason}
              </p>
            )}
          </div>
          <Button 
            onClick={() => navigate("/payment-submission", { 
              state: { 
                orderId: order.id,
                orderData: order
              }
            })}
            variant="destructive"
            className="w-full"
          >
            Resubmit Payment
          </Button>
        </div>
      );
    }

    // No payment submitted yet
    if (!payment || order.payment_status === "unpaid") {
      return (
        <div className="mt-4 space-y-3">
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              💳 Please Pay & Upload Receipt
            </p>
          </div>
          <Button 
            onClick={() => navigate("/payment-submission", { 
              state: { 
                orderId: order.id,
                orderData: order
              }
            })}
            className="w-full"
          >
            Submit Payment Proof
          </Button>
        </div>
      );
    }

    // Payment submitted, pending verification
    if (payment.status === "pending" || order.status === "pending_verification") {
      return (
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            🔍 Payment Verification in Progress
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
            Submitted via {payment.payment_method.toUpperCase()} on {format(new Date(payment.created_at), "MMM dd, yyyy")}
          </p>
        </div>
      );
    }

    // Payment confirmed
    if (payment.status === "approved" || order.payment_status === "paid") {
      return (
        <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <p className="text-sm font-medium text-green-800 dark:text-green-200">
            ✅ Payment Confirmed
          </p>
        </div>
      );
    }

    return null;
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <Link to="/" className="text-2xl font-bold">Dilbar Mobiles</Link>
          </div>
        </header>
        <div className="container mx-auto px-4 py-8 space-y-4">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <Link to="/" className="text-2xl font-bold">Dilbar Mobiles</Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/account")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Account
        </Button>

        <h1 className="text-3xl font-bold mb-8">My Orders</h1>

        {orders && orders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No orders yet</h3>
              <p className="text-muted-foreground mb-6">Start shopping to see your orders here</p>
              <Button asChild>
                <Link to="/shop">Browse Products</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders?.map((order) => (
              <OrderCard key={order.id} order={order} getOrderItems={getOrderItems} getStatusBadge={getStatusBadge} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OrderCard({ order, getOrderItems, getStatusBadge }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  const loadItems = async () => {
    if (!isExpanded) {
      const data = await getOrderItems(order.id);
      setItems(data);
    }
    setIsExpanded(!isExpanded);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">Order #{order.id.slice(0, 8)}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {format(new Date(order.created_at), "PPP")}
            </p>
          </div>
          <div className="text-right">
            {getStatusBadge(order.status)}
            <p className="text-xl font-bold mt-2">Rs. {order.total_amount.toLocaleString()}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Payment Method:</span>
            <Badge variant="outline" className="uppercase">{order.payment_method}</Badge>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Delivery Address:</span>
            <span className="text-right max-w-[60%]">{order.delivery_address}</span>
          </div>
        </div>

        <Separator className="my-4" />

        <Button variant="outline" onClick={loadItems} className="w-full">
          {isExpanded ? "Hide Items" : "View Items"}
        </Button>

        {isExpanded && items.length > 0 && (
          <div className="mt-4 space-y-2 border-t pt-4">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <div>
                  <p className="font-medium">{item.product_name}</p>
                  <p className="text-muted-foreground">Qty: {item.quantity}</p>
                </div>
                <p className="font-medium">Rs. {item.subtotal.toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
