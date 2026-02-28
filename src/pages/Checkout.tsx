import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useProductCartStore } from "@/stores/productCartStore";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { PaymentMethodsStrip } from "@/components/PaymentMethodsStrip";
import { toast } from "sonner";
import { Loader2, Package, Mail } from "lucide-react";
import { getImageUrl } from "@/lib/imageUrl";

export default function Checkout() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { items, getTotalPrice, clearCart } = useProductCartStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: profile?.full_name || "",
    email: user?.email || "",
    phone: profile?.phone || "",
    address: "",
    notes: "",
  });


  const totalPrice = getTotalPrice();
  const deliveryFee = 200;
  const grandTotal = totalPrice + deliveryFee;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
          <Button asChild>
            <Link to="/shop">Browse Products</Link>
          </Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Use user from auth context instead of making a new auth call
      const currentUserId = user?.id || null;

      // Use edge function to create order (bypasses RLS for guest checkout)
      const { data, error } = await supabase.functions.invoke('create-order', {
        body: {
          customerName: formData.name,
          customerEmail: formData.email,
          customerPhone: formData.phone,
          deliveryAddress: formData.address,
          notes: formData.notes,
          totalAmount: grandTotal,
          userId: currentUserId,
          items: items.map(item => ({
            id: item.product.id,
            name: item.product.name,
            price: item.product.price,
            quantity: item.quantity,
            type: item.product.type || 'product',
            images: item.product.images,
            selectedColor: item.selectedColor || null,
            selectedPartType: item.selectedPartType || null,
          })),
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const order = data.order;

      // Clear cart
      clearCart();

      toast.success("Order created!", {
        description: "Redirecting to payment...",
      });

      // Navigate to payment submission page
      navigate("/payment-submission", {
        state: {
          orderId: order.id,
          orderData: order,
        },
      });
    } catch (error: any) {
      console.error("Order creation error:", error);
      toast.error("Failed to place order", {
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <Link to="/" className="text-2xl font-bold">Dilbar Mobiles</Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Checkout</h1>
        
        {!user && (
          <div className="mb-6 p-4 bg-secondary/30 border border-border rounded-lg">
            <p className="text-sm text-muted-foreground">
              You're checking out as a <span className="font-semibold text-foreground">Guest</span>. 
              <Link to="/login" className="text-primary hover:underline ml-1">Sign in</Link> to track your orders easily.
            </p>
          </div>
        )}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Delivery Address</CardTitle>
                </CardHeader>
                <CardContent>
                  <Label htmlFor="address">Complete Address *</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="House/Flat No., Street, Area, Landmark"
                    rows={4}
                    required
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Additional Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any special instructions for your order"
                    rows={3}
                  />
                </CardContent>
              </Card>

              <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Proceed to Checkout"
                )}
              </Button>
            </form>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div key={`${item.product.id}-${item.selectedColor}-${idx}`} className="flex gap-3">
                      <div className="w-16 h-16 bg-secondary/20 rounded overflow-hidden flex-shrink-0">
                        {item.product.images?.[0] ? (
                          <img src={getImageUrl(item.product.images[0])} alt={item.product.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm line-clamp-2">{item.product.name}</p>
                        <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                          <span>Qty: {item.quantity}</span>
                          {item.selectedColor && (
                            <span className="flex items-center gap-1">
                              • Color: 
                              {item.selectedColorCode && (
                                <span className="w-3 h-3 rounded-full border border-border inline-block" style={{ backgroundColor: item.selectedColorCode }} />
                              )}
                              {item.selectedColor}
                            </span>
                          )}
                          {item.selectedPartType && <span>• {item.selectedPartType}</span>}
                        </div>
                      </div>
                      <p className="font-medium text-sm">Rs. {(item.product.price * item.quantity).toLocaleString()}</p>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>Rs. {totalPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Delivery</span>
                    <span>Rs. {deliveryFee.toLocaleString()}</span>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total</span>
                  <span className="text-2xl font-bold">Rs. {grandTotal.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Payment Methods Strip */}
        <div className="mt-12">
          <PaymentMethodsStrip />
        </div>
      </div>
    </div>
  );
}
