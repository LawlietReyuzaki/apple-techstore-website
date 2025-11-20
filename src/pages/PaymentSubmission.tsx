import { useState } from "react";
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

export default function PaymentSubmission() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const orderData = location.state?.orderData;
  const orderId = location.state?.orderId;

  const [paymentMethod, setPaymentMethod] = useState<"easypaisa" | "jazzcash" | "bank_transfer">("easypaisa");
  const [transactionId, setTransactionId] = useState("");
  const [senderNumber, setSenderNumber] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Fetch payment settings
  useState(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from("payment_settings")
        .select("*")
        .single();
      
      setPaymentSettings(data);
    };
    
    fetchSettings();
  });

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
    
    if (!transactionId || !senderNumber) {
      toast.error("Please fill all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      let screenshotUrl = null;

      // Upload screenshot if provided
      if (screenshot) {
        const fileExt = screenshot.name.split('.').pop();
        const fileName = `${orderId}_${Date.now()}.${fileExt}`;
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('payment_screenshots')
          .upload(fileName, screenshot);

        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('payment_screenshots')
          .getPublicUrl(fileName);
        
        screenshotUrl = publicUrl;
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

      // Send payment pending email
      const { error: emailError } = await supabase.functions.invoke('send-order-email', {
        body: {
          orderId,
          type: 'payment_pending',
        },
      });

      if (emailError) {
        console.error('Email error:', emailError);
      }

      toast.success("Payment submitted successfully!", {
        description: "Awaiting admin verification",
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
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="easypaisa" id="easypaisa" />
                  <Label htmlFor="easypaisa" className="flex-1 cursor-pointer">Easypaisa</Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="jazzcash" id="jazzcash" />
                  <Label htmlFor="jazzcash" className="flex-1 cursor-pointer">JazzCash</Label>
                </div>
                <div className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value="bank_transfer" id="bank_transfer" />
                  <Label htmlFor="bank_transfer" className="flex-1 cursor-pointer">Bank Transfer</Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {paymentMethod === "bank_transfer" ? (
                <div className="space-y-3 p-4 bg-muted rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Bank Name:</span>
                    <span>{currentWallet.name || "Not configured"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Account Number:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{currentWallet.number || "Not configured"}</span>
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

          <Card>
            <CardHeader>
              <CardTitle>Submit Payment Proof</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="transactionId">Transaction ID *</Label>
                <Input
                  id="transactionId"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="Enter transaction ID"
                  required
                />
              </div>

              <div>
                <Label htmlFor="senderNumber">Sender Number / Account *</Label>
                <Input
                  id="senderNumber"
                  value={senderNumber}
                  onChange={(e) => setSenderNumber(e.target.value)}
                  placeholder="03XX-XXXXXXX or Account number"
                  required
                />
              </div>

              <div>
                <Label htmlFor="screenshot">Payment Screenshot (Optional)</Label>
                <Input
                  id="screenshot"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
                />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting Payment...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Submit Payment Proof
              </>
            )}
          </Button>
        </form>

        <p className="text-sm text-muted-foreground text-center mt-4">
          Your payment will be verified by our admin within 24 hours
        </p>
      </div>
    </div>
  );
}
