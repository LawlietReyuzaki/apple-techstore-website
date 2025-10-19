import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Phone, ArrowLeft, Wrench, Upload } from "lucide-react";

const BookRepair = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    deviceMake: "",
    deviceModel: "",
    issue: "",
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Generate unique tracking code
      const trackingCode = `R-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      const { data, error } = await supabase
        .from("repairs")
        .insert({
          tracking_code: trackingCode,
          device_make: formData.deviceMake,
          device_model: formData.deviceModel,
          issue: formData.issue,
          description: formData.description,
          status: "created",
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Repair booked successfully!", {
        description: `Your tracking code is: ${trackingCode}`,
      });

      // Navigate to track repair with the tracking code
      navigate(`/track-repair?code=${trackingCode}`);
    } catch (error) {
      console.error("Error booking repair:", error);
      toast.error("Failed to book repair", {
        description: "Please try again or contact us directly.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Phone className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Dilbar Mobiles</h1>
              <p className="text-xs text-muted-foreground">Repair Shop</p>
            </div>
          </Link>

          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Wrench className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold mb-2">Book a Repair</h1>
            <p className="text-muted-foreground text-lg">
              Professional repair service for all major brands
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Device Information</CardTitle>
              <CardDescription>
                Tell us about your device and the issue you're experiencing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="deviceMake">Device Make *</Label>
                    <Select
                      value={formData.deviceMake}
                      onValueChange={(value) =>
                        setFormData({ ...formData, deviceMake: value })
                      }
                      required
                    >
                      <SelectTrigger id="deviceMake">
                        <SelectValue placeholder="Select brand" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Apple">Apple</SelectItem>
                        <SelectItem value="Samsung">Samsung</SelectItem>
                        <SelectItem value="Google">Google</SelectItem>
                        <SelectItem value="Xiaomi">Xiaomi</SelectItem>
                        <SelectItem value="Huawei">Huawei</SelectItem>
                        <SelectItem value="Oppo">Oppo</SelectItem>
                        <SelectItem value="Vivo">Vivo</SelectItem>
                        <SelectItem value="OnePlus">OnePlus</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="deviceModel">Device Model *</Label>
                    <Input
                      id="deviceModel"
                      placeholder="e.g., iPhone 13, Galaxy S21"
                      value={formData.deviceModel}
                      onChange={(e) =>
                        setFormData({ ...formData, deviceModel: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="issue">Issue Type *</Label>
                  <Select
                    value={formData.issue}
                    onValueChange={(value) =>
                      setFormData({ ...formData, issue: value })
                    }
                    required
                  >
                    <SelectTrigger id="issue">
                      <SelectValue placeholder="What needs repair?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Screen Replacement">
                        Screen Replacement
                      </SelectItem>
                      <SelectItem value="Battery Replacement">
                        Battery Replacement
                      </SelectItem>
                      <SelectItem value="Charging Port">Charging Port</SelectItem>
                      <SelectItem value="Camera Issues">Camera Issues</SelectItem>
                      <SelectItem value="Water Damage">Water Damage</SelectItem>
                      <SelectItem value="Software Issues">
                        Software Issues
                      </SelectItem>
                      <SelectItem value="Speaker/Microphone">
                        Speaker/Microphone
                      </SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the issue in detail..."
                    rows={4}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Provide as much detail as possible to help us prepare for your
                    repair
                  </p>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-semibold mb-4">Next Steps</h3>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        1
                      </div>
                      <p>Submit this form to get your tracking code</p>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        2
                      </div>
                      <p>
                        Visit our shop at Bahria Phase 7 or we'll arrange pickup
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        3
                      </div>
                      <p>
                        We'll provide an estimate and timeline for your repair
                      </p>
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? "Booking..." : "Book Repair"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground mb-2">Need help?</p>
            <div className="flex justify-center gap-4">
              <a href="tel:+923001234567" className="text-primary hover:underline">
                Call: +92 300 1234567
              </a>
              <span className="text-muted-foreground">|</span>
              <a
                href="https://wa.me/923001234567"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookRepair;
