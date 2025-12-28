import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Phone, ArrowLeft, Wrench, Upload, Shield, Clock, CheckCircle } from "lucide-react";
import repairHeroImage from "@/assets/hero-expert-repair.png";

const BookRepair = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    deviceMake: "",
    deviceModel: "",
    issue: "",
    description: "",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Generate unique tracking code
      const trackingCode = `R-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      const insertData: any = {
        tracking_code: trackingCode,
        device_make: formData.deviceMake,
        device_model: formData.deviceModel,
        issue: formData.issue,
        description: formData.description,
        customer_name: formData.customerName,
        customer_email: formData.customerEmail,
        customer_phone: formData.customerPhone,
        status: "created",
      };

      // Add user_id if logged in (use user from auth context)
      if (user) {
        insertData.user_id = user.id;
      }

      const { data, error } = await supabase
        .from("repairs")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      // Email will be sent by admin when repair is approved

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
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-1/3 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse-slow" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 glass-effect border-b animate-fade-in">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center group-hover:scale-110 transition-transform duration-300 animate-glow">
              <Phone className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Dilbar Mobiles</h1>
              <p className="text-xs text-muted-foreground">Expert Repair Service</p>
            </div>
          </Link>

          <Link to="/">
            <Button variant="ghost" size="sm" className="group hover:bg-primary/10 transition-all duration-300">
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12 relative z-10">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12 animate-fade-in-up relative rounded-3xl overflow-hidden group mb-16">
            <div 
              className="absolute inset-0 bg-cover bg-center transform transition-transform duration-700 group-hover:scale-110"
              style={{ backgroundImage: `url(${repairHeroImage})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-accent/60 to-primary/80" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            
            {/* Animated Border */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_100%] animate-gradient-shift opacity-40 blur-sm" />
            
            <div className="relative z-10 py-20 px-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-lg mb-6 animate-glow shadow-2xl border border-white/20">
                <Wrench className="h-10 w-10 text-white drop-shadow-lg" />
              </div>
              <h1 className="text-5xl md:text-6xl font-extrabold mb-6 text-white drop-shadow-2xl animate-shimmer bg-gradient-to-r from-white via-white to-white/80 bg-clip-text text-transparent bg-[length:200%_100%]">
                Book a Repair
              </h1>
              <p className="text-white/95 text-xl md:text-2xl max-w-2xl mx-auto font-light tracking-wide drop-shadow-lg mb-8">
                Professional repair service for all major brands
              </p>
              
              {/* Trust Indicators */}
              <div className="flex flex-wrap justify-center gap-6 mt-8">
                <div className="flex items-center gap-2 glass-effect px-4 py-2 rounded-full border border-white/20 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                  <Shield className="h-5 w-5 text-white" />
                  <span className="text-white text-sm font-medium">90-Day Warranty</span>
                </div>
                <div className="flex items-center gap-2 glass-effect px-4 py-2 rounded-full border border-white/20 animate-fade-in" style={{ animationDelay: '0.4s' }}>
                  <Clock className="h-5 w-5 text-white" />
                  <span className="text-white text-sm font-medium">Same-Day Service</span>
                </div>
                <div className="flex items-center gap-2 glass-effect px-4 py-2 rounded-full border border-white/20 animate-fade-in" style={{ animationDelay: '0.6s' }}>
                  <CheckCircle className="h-5 w-5 text-white" />
                  <span className="text-white text-sm font-medium">Certified Technicians</span>
                </div>
              </div>
              
              {/* Decorative Elements */}
              <div className="absolute top-10 right-10 w-20 h-20 border-2 border-white/20 rounded-full animate-pulse-slow" />
              <div className="absolute bottom-10 left-10 w-16 h-16 border-2 border-accent/30 rounded-full animate-pulse-slow" style={{ animationDelay: '1s' }} />
            </div>
          </div>

          <Card className="glass-card border-primary/20 shadow-2xl animate-scale-in hover:shadow-primary/20 transition-all duration-500">
            <CardHeader className="space-y-3">
              <CardTitle className="text-2xl bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                Device Information
              </CardTitle>
              <CardDescription className="text-base">
                Tell us about your device and the issue you're experiencing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 animate-slide-in-left" style={{ animationDelay: '0.1s' }}>
                    <Label htmlFor="customerName" className="text-sm font-medium">Your Name *</Label>
                    <Input
                      id="customerName"
                      required
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      placeholder="Enter your full name"
                      className="h-11 glass-effect border-primary/20 focus:border-primary/50 focus:ring-2 focus:ring-primary/30 transition-all duration-300"
                    />
                  </div>

                  <div className="space-y-2 animate-slide-in-right" style={{ animationDelay: '0.1s' }}>
                    <Label htmlFor="customerEmail" className="text-sm font-medium">Your Email *</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      required
                      value={formData.customerEmail}
                      onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                      placeholder="your.email@example.com"
                      className="h-11 glass-effect border-primary/20 focus:border-primary/50 focus:ring-2 focus:ring-primary/30 transition-all duration-300"
                    />
                  </div>

                  <div className="space-y-2 animate-slide-in-left" style={{ animationDelay: '0.2s' }}>
                    <Label htmlFor="customerPhone" className="text-sm font-medium">Your Phone Number *</Label>
                    <Input
                      id="customerPhone"
                      type="tel"
                      required
                      value={formData.customerPhone}
                      onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                      placeholder="+92 300 1234567"
                      className="h-11 glass-effect border-primary/20 focus:border-primary/50 focus:ring-2 focus:ring-primary/30 transition-all duration-300"
                    />
                  </div>

                  <div className="space-y-2 animate-slide-in-right" style={{ animationDelay: '0.2s' }}>
                    <Label htmlFor="deviceMake" className="text-sm font-medium">Device Make *</Label>
                    <Select
                      value={formData.deviceMake}
                      onValueChange={(value) =>
                        setFormData({ ...formData, deviceMake: value })
                      }
                      required
                    >
                      <SelectTrigger id="deviceMake" className="h-11 glass-effect border-primary/20 hover:border-primary/50 transition-all duration-300">
                        <SelectValue placeholder="Select brand" />
                      </SelectTrigger>
                      <SelectContent className="glass-effect">
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

                  <div className="space-y-2 md:col-span-2 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                    <Label htmlFor="deviceModel" className="text-sm font-medium">Device Model *</Label>
                    <Input
                      id="deviceModel"
                      placeholder="e.g., iPhone 13, Galaxy S21"
                      value={formData.deviceModel}
                      onChange={(e) =>
                        setFormData({ ...formData, deviceModel: e.target.value })
                      }
                      required
                      className="h-11 glass-effect border-primary/20 focus:border-primary/50 focus:ring-2 focus:ring-primary/30 transition-all duration-300"
                    />
                  </div>
                </div>

                <div className="space-y-2 animate-fade-in" style={{ animationDelay: '0.4s' }}>
                  <Label htmlFor="issue" className="text-sm font-medium">Issue Type *</Label>
                  <Select
                    value={formData.issue}
                    onValueChange={(value) =>
                      setFormData({ ...formData, issue: value })
                    }
                    required
                  >
                    <SelectTrigger id="issue" className="h-11 glass-effect border-primary/20 hover:border-primary/50 transition-all duration-300">
                      <SelectValue placeholder="What needs repair?" />
                    </SelectTrigger>
                    <SelectContent className="glass-effect">
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

                <div className="space-y-2 animate-fade-in" style={{ animationDelay: '0.5s' }}>
                  <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the issue in detail..."
                    rows={4}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="glass-effect border-primary/20 focus:border-primary/50 focus:ring-2 focus:ring-primary/30 transition-all duration-300 resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Provide as much detail as possible to help us prepare for your repair
                  </p>
                </div>

                <div className="border-t border-primary/10 pt-6 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
                  <h3 className="font-semibold text-lg mb-6 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                    Next Steps
                  </h3>
                  <div className="space-y-4">
                    <div className="flex gap-4 group animate-slide-in-left" style={{ animationDelay: '0.7s' }}>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0 font-bold text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                        1
                      </div>
                      <p className="text-sm leading-relaxed group-hover:text-foreground transition-colors">
                        Submit this form to get your tracking code
                      </p>
                    </div>
                    <div className="flex gap-4 group animate-slide-in-left" style={{ animationDelay: '0.8s' }}>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0 font-bold text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                        2
                      </div>
                      <p className="text-sm leading-relaxed group-hover:text-foreground transition-colors">
                        Visit our shop at Bahria Phase 7 or we'll arrange pickup
                      </p>
                    </div>
                    <div className="flex gap-4 group animate-slide-in-left" style={{ animationDelay: '0.9s' }}>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0 font-bold text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                        3
                      </div>
                      <p className="text-sm leading-relaxed group-hover:text-foreground transition-colors">
                        We'll provide an estimate and timeline for your repair
                      </p>
                    </div>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-semibold text-lg shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 animate-glow animate-fade-in-up" 
                  size="lg" 
                  disabled={loading}
                  style={{ animationDelay: '1s' }}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Booking...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Wrench className="h-5 w-5" />
                      Book Repair
                    </span>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="mt-12 text-center animate-fade-in-up" style={{ animationDelay: '1.1s' }}>
            <div className="glass-effect rounded-2xl p-6 border border-primary/20 shadow-xl">
              <p className="text-sm font-medium mb-4 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                Need help? Contact us
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <a 
                  href="tel:+923001234567" 
                  className="px-6 py-3 bg-gradient-to-r from-primary to-accent text-white rounded-full font-medium hover:scale-105 hover:shadow-lg transition-all duration-300 inline-flex items-center gap-2"
                >
                  <Phone className="h-4 w-4" />
                  Call: +92 300 1234567
                </a>
                <a
                  href="https://wa.me/923001234567"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 glass-effect border border-primary/30 rounded-full font-medium hover:scale-105 hover:border-primary/50 hover:shadow-lg transition-all duration-300 inline-flex items-center gap-2"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookRepair;
