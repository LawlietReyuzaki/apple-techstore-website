import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Eye, CheckCircle, XCircle, RefreshCcw } from "lucide-react";

export default function Payments() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasRole, loading: authLoading } = useAuth();
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "declined" | "refunded">("all");
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [declineDialogOpen, setDeclineDialogOpen] = useState(false);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [refundWalletNumber, setRefundWalletNumber] = useState("");
  const [refundNotes, setRefundNotes] = useState("");
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  const isAdmin = hasRole("admin");

  const { data: payments, isLoading } = useQuery({
    queryKey: ["admin-payments", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("payments")
        .select(`
          *,
          orders!payments_order_id_fkey(
            customer_name,
            customer_email,
            customer_phone
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

  // Generate signed URLs for payment screenshots
  useEffect(() => {
    const generateSignedUrls = async () => {
      if (!payments) return;
      
      const urls: Record<string, string> = {};
      
      for (const payment of payments) {
        if (payment.payment_screenshot_url) {
          try {
            // Extract filename from URL if it's a full URL
            let filePath = payment.payment_screenshot_url;
            
            // Check if it's a full URL and extract just the filename
            if (filePath.includes('payment_screenshots/')) {
              filePath = filePath.split('payment_screenshots/')[1];
            }
            
            // Generate signed URL valid for 1 hour
            const { data, error } = await supabase.storage
              .from('payment_screenshots')
              .createSignedUrl(filePath, 3600);
            
            if (!error && data?.signedUrl) {
              urls[payment.id] = data.signedUrl;
            } else {
              console.error(`Failed to generate signed URL for payment ${payment.id}:`, error);
            }
          } catch (err) {
            console.error(`Error generating signed URL for payment ${payment.id}:`, err);
          }
        }
      }
      
      setSignedUrls(urls);
    };
    
    generateSignedUrls();
  }, [payments]);

  const approvePaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const { error } = await supabase
        .from("payments")
        .update({
          status: "approved",
          verified_at: new Date().toISOString(),
        })
        .eq("id", paymentId);

      if (error) throw error;

      // Update order payment status
      const payment = payments?.find(p => p.id === paymentId);
      if (payment) {
        await supabase
          .from("orders")
          .update({ 
            payment_status: "paid",
            status: "processing"
          })
          .eq("id", payment.order_id);

        // Send approval email
        await supabase.functions.invoke('send-order-email', {
          body: {
            orderId: payment.order_id,
            type: 'payment_approved',
          },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
      toast.success("Payment approved successfully");
      setApproveDialogOpen(false);
      setSelectedPayment(null);
    },
    onError: (error: any) => {
      toast.error("Failed to approve payment", {
        description: error.message,
      });
    },
  });

  const declinePaymentMutation = useMutation({
    mutationFn: async ({ paymentId, reason }: { paymentId: string; reason: string }) => {
      const { error } = await supabase
        .from("payments")
        .update({
          status: "declined",
          decline_reason: reason,
          verified_at: new Date().toISOString(),
        })
        .eq("id", paymentId);

      if (error) throw error;

      // Update order status and send decline email
      const payment = payments?.find(p => p.id === paymentId);
      if (payment) {
        await supabase
          .from("orders")
          .update({ 
            payment_status: "unpaid",
            status: "payment_rejected"
          })
          .eq("id", payment.order_id);

        await supabase.functions.invoke('send-order-email', {
          body: {
            orderId: payment.order_id,
            type: 'payment_declined',
            declineReason: reason,
          },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
      toast.success("Payment declined");
      setDeclineDialogOpen(false);
      setDeclineReason("");
      setSelectedPayment(null);
    },
    onError: (error: any) => {
      toast.error("Failed to decline payment", {
        description: error.message,
      });
    },
  });

  const refundPaymentMutation = useMutation({
    mutationFn: async ({ paymentId, walletNumber, notes }: { paymentId: string; walletNumber: string; notes: string }) => {
      const { error } = await supabase
        .from("payments")
        .update({
          status: "refunded",
          refund_wallet_number: walletNumber,
          admin_notes: notes,
        })
        .eq("id", paymentId);

      if (error) throw error;

      // Send refund email
      const payment = payments?.find(p => p.id === paymentId);
      if (payment) {
        await supabase.functions.invoke('send-order-email', {
          body: {
            orderId: payment.order_id,
            type: 'payment_refunded',
            customNote: notes,
          },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-payments"] });
      toast.success("Payment refunded");
      setRefundDialogOpen(false);
      setRefundWalletNumber("");
      setRefundNotes("");
      setSelectedPayment(null);
    },
    onError: (error: any) => {
      toast.error("Failed to process refund", {
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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      approved: "default",
      declined: "destructive",
      refunded: "secondary",
    };

    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Payment Verification</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Payments</CardTitle>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Receipt</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments?.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-mono text-xs">{payment.transaction_id}</TableCell>
                  <TableCell>{payment.orders.customer_name}</TableCell>
                  <TableCell className="capitalize text-xs">{payment.payment_method.replace('_', ' ')}</TableCell>
                  <TableCell className="font-semibold">PKR {payment.amount.toLocaleString()}</TableCell>
                  <TableCell>
                    {payment.payment_screenshot_url && signedUrls[payment.id] ? (
                      <img 
                        src={signedUrls[payment.id]} 
                        alt="Receipt Thumbnail" 
                        className="w-12 h-12 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => {
                          setSelectedPayment(payment);
                          setViewDialogOpen(true);
                        }}
                      />
                    ) : payment.payment_screenshot_url ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <span className="text-xs text-muted-foreground">No receipt</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(payment.status)}</TableCell>
                  <TableCell className="text-xs">{new Date(payment.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedPayment(payment);
                          setViewDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {payment.status === "pending" && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedPayment(payment);
                              setApproveDialogOpen(true);
                            }}
                          >
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedPayment(payment);
                              setDeclineDialogOpen(true);
                            }}
                          >
                            <XCircle className="h-4 w-4 text-red-600" />
                          </Button>
                        </>
                      )}
                      {payment.status === "approved" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedPayment(payment);
                            setRefundDialogOpen(true);
                          }}
                        >
                          <RefreshCcw className="h-4 w-4 text-orange-600" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Payment Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Transaction ID</Label>
                  <p className="font-mono">{selectedPayment.transaction_id}</p>
                </div>
                <div>
                  <Label>Amount</Label>
                  <p className="font-semibold">PKR {selectedPayment.amount.toLocaleString()}</p>
                </div>
                <div>
                  <Label>Payment Method</Label>
                  <p className="capitalize">{selectedPayment.payment_method.replace('_', ' ')}</p>
                </div>
                <div>
                  <Label>Sender Number</Label>
                  <p>{selectedPayment.sender_number}</p>
                </div>
                <div>
                  <Label>Customer</Label>
                  <p>{selectedPayment.orders.customer_name}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  {getStatusBadge(selectedPayment.status)}
                </div>
              </div>
              
              {selectedPayment.payment_screenshot_url && signedUrls[selectedPayment.id] ? (
                <div className="space-y-2">
                  <Label>Payment Receipt Screenshot</Label>
                  <a 
                    href={signedUrls[selectedPayment.id]} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img 
                      src={signedUrls[selectedPayment.id]} 
                      alt="Payment Screenshot" 
                      className="mt-2 rounded-lg border max-h-96 w-full object-contain cursor-pointer hover:opacity-80 transition-opacity"
                    />
                  </a>
                  <p className="text-xs text-muted-foreground">Click image to view full size in new tab</p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(signedUrls[selectedPayment.id], '_blank')}
                    >
                      Open Full Size
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(signedUrls[selectedPayment.id]);
                        toast.success("Receipt URL copied to clipboard");
                      }}
                    >
                      Copy URL
                    </Button>
                  </div>
                </div>
              ) : selectedPayment.payment_screenshot_url ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    No payment receipt uploaded
                  </p>
                </div>
              )}

              {selectedPayment.decline_reason && (
                <div>
                  <Label>Decline Reason</Label>
                  <p className="text-red-600">{selectedPayment.decline_reason}</p>
                </div>
              )}

              {selectedPayment.refund_wallet_number && (
                <div>
                  <Label>Refund Wallet Number</Label>
                  <p>{selectedPayment.refund_wallet_number}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Payment</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this payment? This will mark the order as paid.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedPayment && approvePaymentMutation.mutate(selectedPayment.id)}
              disabled={approvePaymentMutation.isPending}
            >
              {approvePaymentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Approve Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline Dialog */}
      <Dialog open={declineDialogOpen} onOpenChange={setDeclineDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Payment</DialogTitle>
            <DialogDescription>
              Please provide a reason for declining this payment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="declineReason">Reason</Label>
              <Textarea
                id="declineReason"
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Enter decline reason..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedPayment && declinePaymentMutation.mutate({
                paymentId: selectedPayment.id,
                reason: declineReason,
              })}
              disabled={!declineReason || declinePaymentMutation.isPending}
            >
              {declinePaymentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Decline Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Refund</DialogTitle>
            <DialogDescription>
              Enter the customer's wallet number to process the refund.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="refundWallet">Customer Wallet Number *</Label>
              <Input
                id="refundWallet"
                value={refundWalletNumber}
                onChange={(e) => setRefundWalletNumber(e.target.value)}
                placeholder="03XX-XXXXXXX"
              />
            </div>
            <div>
              <Label htmlFor="refundNotes">Admin Notes (Optional)</Label>
              <Textarea
                id="refundNotes"
                value={refundNotes}
                onChange={(e) => setRefundNotes(e.target.value)}
                placeholder="Any additional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedPayment && refundPaymentMutation.mutate({
                paymentId: selectedPayment.id,
                walletNumber: refundWalletNumber,
                notes: refundNotes,
              })}
              disabled={!refundWalletNumber || refundPaymentMutation.isPending}
            >
              {refundPaymentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Process Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
