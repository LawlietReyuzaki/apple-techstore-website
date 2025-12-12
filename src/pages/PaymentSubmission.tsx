import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Loader2, Upload, Copy, CheckCircle } from "lucide-react";

// Generate unique transaction ID
const generateTransactionId = () => {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TXN-${timestamp}-${randomStr}`;
};

export default function PaymentSubmission() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const orderData = location.state?.orderData;
  const orderId = location.state?.orderId;
  const [orderDetails, setOrderDetails] = useState<any>(null);

  const [paymentMethod, setPaymentMethod] = useState<"easypaisa" | "jazzcash" | "bank_transfer" | "cod">("easypaisa");
  const [transactionId, setTransactionId] = useState(generateTransactionId());
  const [senderNumber, setSenderNumber] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Fetch payment settings and order details
  useEffect(() => {
    const fetchData = async () => {
      // Fetch payment settings
      const { data: settings } = await supabase
        .from("payment_settings")
        .select("*")
        .single();
      
      setPaymentSettings(settings);

      // Set default payment method based on what's enabled
      if (settings) {
        if (settings.enable_cod) {
          setPaymentMethod("cod");
        } else if (settings.enable_easypaisa) {
          setPaymentMethod("easypaisa");
        } else if (settings.enable_jazzcash) {
          setPaymentMethod("jazzcash");
        } else if (settings.enable_bank_transfer) {
          setPaymentMethod("bank_transfer");
        }
      }

      // Fetch order details if orderId is provided
      if (orderId) {
        const { data: order } = await supabase
          .from("orders")
          .select("*")
          .eq("id", orderId)
          .single();
        
        setOrderDetails(order);
      }
    };
    
    fetchData();
  }, [orderId]);

  if (!orderData || !orderId) {
    navigate("/checkout");
    return null;
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // For COD, we don't need payment proof
    if (paymentMethod !== "cod") {
      if (!transactionId || !senderNumber) {
        toast.error("Please fill all required fields");
        return;
      }

      // Validate sender number length (must be 11 digits for Pakistani numbers)
      const cleanedNumber = senderNumber.replace(/\D/g, '');
      if (cleanedNumber.length !== 11) {
        toast.error("Invalid phone number", {
          description: "Phone number must be exactly 11 digits (e.g., 03001234567)"
        });
        return;
      }

      // Require payment screenshot for non-COD payments
      if (!screenshot) {
        toast.error("Payment receipt required", {
          description: "Please upload a screenshot of your payment receipt"
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Handle Cash on Delivery separately
      if (paymentMethod === "cod") {
        // Update order with COD status
        await supabase
          .from("orders")
          .update({ 
            payment_method: "cod",
            payment_status: "cod",
            status: "processing"
          })
          .eq("id", orderId);

        // Send COD order confirmation email to admin and customer
        const { error: emailError } = await supabase.functions.invoke('send-order-email', {
          body: {
            orderId,
            type: 'payment_submitted',
            paymentMethod: 'cod',
          },
        });

        if (emailError) {
          console.error('Email error:', emailError);
        }

        toast.success("Order confirmed!", {
          description: "You will pay cash when your order is delivered. Confirmation email sent!",
        });

        navigate("/account/orders");
        return;
      }

      // Handle digital payment methods (Easypaisa, JazzCash, Bank Transfer)
      let screenshotUrl = null;

      // Upload screenshot if provided
      if (screenshot) {
        const fileExt = screenshot.name.split('.').pop();
        const fileName = `${orderId}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('payment_screenshots')
          .upload(fileName, screenshot);

        if (uploadError) throw uploadError;
        
        // Store just the file path (not public URL) since bucket is private
        screenshotUrl = fileName;
      }

      // Create payment record
      const { error: paymentError } = await supabase
        .from("payments")
        .insert({
          order_id: orderId,
          user_id: user?.id || null,
          transaction_id: transactionId,
          sender_number: senderNumber,
          payment_screenshot_url: screenshotUrl,
          amount: orderData.total_amount,
          payment_method: paymentMethod,
          status: "pending",
        });

      if (paymentError) throw paymentError;

      // Update order payment status, payment method, and status
      await supabase
        .from("orders")
        .update({ 
          payment_method: paymentMethod,
          payment_status: "pending",
          status: "pending_verification"
        })
        .eq("id", orderId);

      // Send payment submitted email to admin and customer
      const { error: emailError } = await supabase.functions.invoke('send-order-email', {
        body: {
          orderId,
          type: 'payment_submitted',
          paymentMethod: paymentMethod,
        },
      });

      if (emailError) {
        console.error('Email error:', emailError);
      }

      toast.success("Payment receipt submitted successfully!", {
        description: "Your payment is being verified by admin. Confirmation email sent!",
      });

      navigate("/account/orders");
    } catch (error: any) {
      console.error("Payment submission error:", error);
      toast.error("Failed to submit payment", {
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentWallet = paymentMethod === "easypaisa" 
    ? { number: paymentSettings?.easypaisa_number, qr: paymentSettings?.easypaisa_qr_code_url }
    : paymentMethod === "jazzcash"
    ? { number: paymentSettings?.jazzcash_number, qr: paymentSettings?.jazzcash_qr_code_url }
    : { number: paymentSettings?.bank_account_number, name: paymentSettings?.bank_name };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container max-w-2xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Complete Payment</h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order ID:</span>
                <span className="font-mono">#{orderId.slice(0, 8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Amount:</span>
                <span className="font-bold text-lg">PKR {orderData.total_amount.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Select Payment Method</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
                {paymentSettings?.enable_cod && (
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="cod" id="cod" />
                    <Label htmlFor="cod" className="flex-1 cursor-pointer">
                      Cash on Delivery (COD)
                      <p className="text-sm text-muted-foreground">Pay when you receive your order</p>
                    </Label>
                  </div>
                )}
                {paymentSettings?.enable_easypaisa && (
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="easypaisa" id="easypaisa" />
                    <Label htmlFor="easypaisa" className="flex-1 cursor-pointer">Easypaisa</Label>
                  </div>
                )}
                {paymentSettings?.enable_jazzcash && (
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="jazzcash" id="jazzcash" />
                    <Label htmlFor="jazzcash" className="flex-1 cursor-pointer">JazzCash</Label>
                  </div>
                )}
                {paymentSettings?.enable_bank_transfer && (
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="bank_transfer" id="bank_transfer" />
                    <Label htmlFor="bank_transfer" className="flex-1 cursor-pointer">Bank Transfer</Label>
                  </div>
                )}
              </RadioGroup>
            </CardContent>
          </Card>

          {paymentMethod !== "cod" && (
            <Card>
              <CardHeader>
                <CardTitle>Payment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {paymentMethod === "bank_transfer" ? (
                <div className="space-y-3 p-4 bg-muted rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Bank Name:</span>
                    <span>{paymentSettings?.bank_name || "Not configured"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Account Title:</span>
                    <span>{paymentSettings?.bank_account_name || "Not configured"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Account Number:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{paymentSettings?.bank_account_number || "Not configured"}</span>
                      {paymentSettings?.bank_account_number && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(paymentSettings.bank_account_number)}
                        >
                          {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      )}
                    </div>
                  </div>
                  {paymentSettings?.iban && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">IBAN:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{paymentSettings.iban}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(paymentSettings.iban)}
                        >
                          {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
                    <span className="text-sm font-medium">Wallet Number:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-lg">{currentWallet.number || "Not configured"}</span>
                      {currentWallet.number && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(currentWallet.number)}
                        >
                          {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {currentWallet.qr && (
                    <div className="flex justify-center p-4 bg-muted rounded-lg">
                      <img src={currentWallet.qr} alt="QR Code" className="w-48 h-48" />
                    </div>
                  )}
                </div>
                )}
              </CardContent>
            </Card>
          )}

          {paymentMethod !== "cod" && paymentSettings?.additional_instructions && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Payment Instructions</h3>
                    <p className="text-sm text-muted-foreground">{paymentSettings.additional_instructions}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {paymentMethod !== "cod" && (
            <Card>
              <CardHeader>
                <CardTitle>Submit Payment Proof</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="transactionId">Transaction ID (Auto-generated)</Label>
                  <Input
                    id="transactionId"
                    value={transactionId}
                    readOnly
                    className="bg-muted cursor-not-allowed"
                  />
                </div>

                <div>
                  <Label htmlFor="senderNumber">Sender Number / Account *</Label>
                  <Input
                    id="senderNumber"
                    value={senderNumber}
                    onChange={(e) => setSenderNumber(e.target.value)}
                    placeholder="03001234567 (11 digits)"
                    maxLength={11}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter 11-digit phone number (e.g., 03001234567)
                  </p>
                </div>

                <div>
                  <Label htmlFor="screenshot">Payment Screenshot *</Label>
                  <Input
                    id="screenshot"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) {
                        setScreenshot(null);
                        return;
                      }

                      // Validate file type
                      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
                      if (!validTypes.includes(file.type)) {
                        toast.error("Invalid file format", {
                          description: "Please upload JPG, PNG, or WEBP image only"
                        });
                        e.target.value = '';
                        setScreenshot(null);
                        return;
                      }

                      // Validate file size (max 5MB)
                      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
                      if (file.size > maxSize) {
                        toast.error("File too large", {
                          description: "Image must be smaller than 5MB"
                        });
                        e.target.value = '';
                        setScreenshot(null);
                        return;
                      }

                      setScreenshot(file);
                      toast.success("Image uploaded successfully");
                    }}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload JPG, PNG, or WEBP image (max 5MB)
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {paymentMethod === "cod" ? "Confirming Order..." : "Submitting Payment..."}
              </>
            ) : paymentMethod === "cod" ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Confirm Order (Pay on Delivery)
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Submit Payment Proof
              </>
            )}
          </Button>
        </form>

        {paymentMethod !== "cod" && (
          <p className="text-sm text-muted-foreground text-center mt-4">
            Your payment will be verified by our admin within 24 hours
          </p>
        )}
        {paymentMethod === "cod" && (
          <p className="text-sm text-muted-foreground text-center mt-4">
            You will pay cash when your order is delivered to your address
          </p>
        )}
      </div>
    </div>
  );
}
