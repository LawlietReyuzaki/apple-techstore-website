import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sendOrderStatusUpdate } from "@/utils/emailNotifications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { Package, Phone, Mail, MapPin } from "lucide-react";

export default function AdminOrders() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin, loading: authLoading } = useAuth();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [approveConfirmId, setApproveConfirmId] = useState<string | null>(null);
  const [declineConfirmId, setDeclineConfirmId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error("Access denied");
      navigate("/");
    }
  }, [isAdmin, authLoading, navigate]);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select(`
          *,
          payments!payments_order_id_fkey (
            id,
            status,
            payment_method,
            payment_screenshot_url,
            transaction_id,
            sender_number,
            created_at
          )
        `)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const { data: orderItems } = useQuery({
    queryKey: ["order-items", selectedOrder?.id],
    queryFn: async () => {
      if (!selectedOrder) return [];

      const { data, error } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", selectedOrder.id);

      if (error) throw error;
      return data;
    },
    enabled: !!selectedOrder,
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", id);

      if (error) throw error;
      return { id, status };
    },
    onSuccess: async ({ id, status }) => {
      try {
        await supabase.functions.invoke('send-order-email', {
          body: { orderId: id, type: 'order_status_update', newStatus: status }
        });
        toast.success("Order status updated and email sent to customer");
      } catch (emailError) {
        console.error('Failed to send status update email:', emailError);
        toast.warning("Order status updated but email failed to send");
      }
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: () => {
      toast.error("Failed to update order");
    },
  });

  const approveOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from("orders")
        .update({ status: "processing" })
        .eq("id", orderId);

      if (error) throw error;
      return orderId;
    },
    onSuccess: async (orderId) => {
      try {
        await supabase.functions.invoke('send-order-email', {
          body: { orderId, type: 'order_approved' }
        });
        toast.success("Order approved and email sent to customer");
      } catch (emailError) {
        console.error('Failed to send approval email:', emailError);
        toast.warning("Order approved but email failed to send");
      }
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      setApproveConfirmId(null);
    },
    onError: () => {
      toast.error("Failed to approve order");
    },
  });

  const declineOrderMutation = useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason: string }) => {
      const { error } = await supabase
        .from("orders")
        .update({ status: "cancelled", notes: reason })
        .eq("id", orderId);

      if (error) throw error;
      return { orderId, reason };
    },
    onSuccess: async ({ orderId, reason }) => {
      try {
        await supabase.functions.invoke('send-order-email', {
          body: { orderId, type: 'order_declined', declineReason: reason }
        });
        toast.success("Order declined and email sent to customer");
      } catch (emailError) {
        console.error('Failed to send decline email:', emailError);
        toast.warning("Order declined but email failed to send");
      }
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      setDeclineConfirmId(null);
      setDeclineReason("");
    },
    onError: () => {
      toast.error("Failed to decline order");
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      processing: "default",
      shipped: "outline",
      delivered: "outline",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
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
        <CardHeader className="p-3 md:p-6">
          <CardTitle className="text-lg md:text-2xl">Order Management</CardTitle>
          <div className="flex flex-wrap gap-2 mt-3 md:mt-4">
            <Button
              variant={statusFilter === "pending" ? "default" : "outline"}
              onClick={() => setStatusFilter("pending")}
              size="sm"
              className="text-xs md:text-sm"
            >
              Pending
            </Button>
            <Button
              variant={statusFilter === "processing" ? "default" : "outline"}
              onClick={() => setStatusFilter("processing")}
              size="sm"
              className="text-xs md:text-sm"
            >
              Approved
            </Button>
            <Button
              variant={statusFilter === "delivered" ? "default" : "outline"}
              onClick={() => setStatusFilter("delivered")}
              size="sm"
              className="text-xs md:text-sm"
            >
              Completed
            </Button>
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              onClick={() => setStatusFilter("all")}
              size="sm"
              className="text-xs md:text-sm"
            >
              All
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3 md:p-6">
          {orders && orders.length === 0 ? (
            <div className="text-center py-8 md:py-12">
              <Package className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg md:text-xl">No orders yet</p>
            </div>
          ) : (
            <>
              {/* Mobile card layout */}
              <div className="md:hidden space-y-3">
                {orders?.map((order) => (
                  <Card key={order.id} className="border">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-sm">{order.customer_name}</p>
                          <p className="text-xs text-muted-foreground">{order.customer_phone}</p>
                        </div>
                        {getStatusBadge(order.status)}
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">ID: {order.id.slice(0, 8)}</span>
                        <span className="font-medium">Rs. {order.total_amount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <Badge variant="outline" className="uppercase text-xs">{order.payment_method}</Badge>
                        <span className="text-xs text-muted-foreground">{format(new Date(order.created_at), "MMM dd")}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedOrder(order)}
                          className="flex-1 text-xs h-8"
                        >
                          View
                        </Button>
                        {order.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => setApproveConfirmId(order.id)}
                              className="flex-1 text-xs h-8"
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setDeclineConfirmId(order.id)}
                              className="text-xs h-8"
                            >
                              Decline
                            </Button>
                          </>
                        )}
                        {order.status === "processing" && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => updateOrderMutation.mutate({ id: order.id, status: "delivered" })}
                            className="flex-1 text-xs h-8"
                          >
                            Complete
                          </Button>
                        )}
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
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders?.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs">
                          {order.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{order.customer_name}</p>
                            <p className="text-xs text-muted-foreground">{order.customer_phone}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">Rs. {order.total_amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="uppercase">{order.payment_method}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell>{format(new Date(order.created_at), "MMM dd, yyyy")}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedOrder(order)}
                            >
                              View
                            </Button>
                            {order.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => setApproveConfirmId(order.id)}
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => setDeclineConfirmId(order.id)}
                                >
                                  Decline
                                </Button>
                              </>
                            )}
                            {order.status === "processing" && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => updateOrderMutation.mutate({ id: order.id, status: "delivered" })}
                              >
                                Mark Complete
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-2 md:mx-auto w-[95vw] md:w-full">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Customer</p>
                      <p className="font-medium">{selectedOrder.customer_name}</p>
                      <p className="text-sm">{selectedOrder.customer_phone}</p>
                    </div>
                  </div>
                  
                  {selectedOrder.customer_email && (
                    <div className="flex items-start gap-2">
                      <Mail className="h-4 w-4 mt-1 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="text-sm">{selectedOrder.customer_email}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Delivery Address</p>
                      <p className="text-sm">{selectedOrder.delivery_address}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Order ID</p>
                    <p className="font-mono text-sm">{selectedOrder.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="text-sm">{format(new Date(selectedOrder.created_at), "PPP")}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Method</p>
                    <Badge variant="outline" className="uppercase">
                      {selectedOrder.payment_method || "Not Set"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Status</p>
                    <Badge variant={selectedOrder.payment_status === "paid" ? "default" : "secondary"}>
                      {selectedOrder.payment_status?.toUpperCase() || "UNPAID"}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Update Status</Label>
                <Select
                  value={selectedOrder.status}
                  onValueChange={(value) =>
                    updateOrderMutation.mutate({ id: selectedOrder.id, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Order Items</h4>
                <div className="border rounded-lg divide-y">
                  {orderItems?.map((item) => (
                    <div key={item.id} className="p-3 flex justify-between">
                      <div>
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-medium">Rs. {item.subtotal.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center p-3 bg-secondary/20 rounded-lg">
                  <span className="font-semibold">Total Amount</span>
                  <span className="text-xl font-bold">Rs. {selectedOrder.total_amount.toLocaleString()}</span>
                </div>
              </div>

              {selectedOrder.notes && (
                <div>
                  <h4 className="font-semibold mb-2">Customer Notes</h4>
                  <p className="text-sm text-muted-foreground bg-secondary/20 p-3 rounded">{selectedOrder.notes}</p>
                </div>
              )}

              {selectedOrder.payments && selectedOrder.payments.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold">Payment Details</h4>
                  {selectedOrder.payments.map((payment: any) => (
                    <Card key={payment.id} className="border-primary/20">
                      <CardContent className="pt-6 space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground">Transaction ID</p>
                            <p className="font-mono">{payment.transaction_id}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Sender Number</p>
                            <p>{payment.sender_number}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Payment Method</p>
                            <Badge variant="outline" className="uppercase">
                              {payment.payment_method}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Payment Status</p>
                            <Badge variant={payment.status === "approved" ? "default" : payment.status === "declined" ? "destructive" : "secondary"}>
                              {payment.status.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                        
                        {payment.payment_screenshot_url && (
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">Payment Receipt</p>
                            <a 
                              href={payment.payment_screenshot_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="block"
                            >
                              <img 
                                src={payment.payment_screenshot_url} 
                                alt="Payment Receipt" 
                                className="rounded-lg border max-h-64 object-contain cursor-pointer hover:opacity-80 transition-opacity"
                              />
                            </a>
                            <p className="text-xs text-muted-foreground mt-1">Click to view full size</p>
                          </div>
                        )}

                        {payment.status === "pending" && (
                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={async () => {
                                try {
                                  await supabase
                                    .from("payments")
                                    .update({ status: "approved", verified_at: new Date().toISOString() })
                                    .eq("id", payment.id);
                                  
                                  await supabase
                                    .from("orders")
                                    .update({ payment_status: "paid", status: "processing" })
                                    .eq("id", selectedOrder.id);

                                  await supabase.functions.invoke('send-order-email', {
                                    body: { orderId: selectedOrder.id, type: 'payment_approved' }
                                  });

                                  toast.success("Payment approved");
                                  queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
                                  setSelectedOrder(null);
                                } catch (error) {
                                  toast.error("Failed to approve payment");
                                }
                              }}
                            >
                              Approve Payment
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={async () => {
                                const reason = prompt("Enter decline reason:");
                                if (reason) {
                                  try {
                                    await supabase
                                      .from("payments")
                                      .update({ status: "declined", decline_reason: reason })
                                      .eq("id", payment.id);
                                    
                                    await supabase
                                      .from("orders")
                                      .update({ payment_status: "unpaid", status: "payment_rejected" })
                                      .eq("id", selectedOrder.id);

                                    await supabase.functions.invoke('send-order-email', {
                                      body: { orderId: selectedOrder.id, type: 'payment_declined', declineReason: reason }
                                    });

                                    toast.success("Payment declined");
                                    queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
                                    setSelectedOrder(null);
                                  } catch (error) {
                                    toast.error("Failed to decline payment");
                                  }
                                }
                              }}
                            >
                              Decline Payment
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation Dialog */}
      <Dialog open={!!approveConfirmId} onOpenChange={(open) => !open && setApproveConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Are you sure you want to approve this order? The customer will receive a confirmation email.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setApproveConfirmId(null)}>
                Cancel
              </Button>
              <Button onClick={() => approveConfirmId && approveOrderMutation.mutate(approveConfirmId)}>
                Approve & Send Email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Decline Confirmation Dialog */}
      <Dialog open={!!declineConfirmId} onOpenChange={(open) => {
        if (!open) {
          setDeclineConfirmId(null);
          setDeclineReason("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Please provide a reason for declining this order:</p>
            <textarea
              className="w-full p-2 border rounded-md min-h-[100px]"
              placeholder="Enter decline reason..."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => {
                setDeclineConfirmId(null);
                setDeclineReason("");
              }}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => declineConfirmId && declineOrderMutation.mutate({ 
                  orderId: declineConfirmId, 
                  reason: declineReason || "No reason provided" 
                })}
              >
                Decline & Send Email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
