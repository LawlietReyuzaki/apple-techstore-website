import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Clock, Mail } from "lucide-react";

export const ContactSection = () => {
  return (
    <section className="py-12 md:py-16 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            Visit Our Shop
          </h2>
          <p className="text-muted-foreground text-lg">
            Best repair shop in Bahria Phase 7 • Walk-ins welcome
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold mb-1">Location</h3>
                  <p className="text-sm text-muted-foreground">
                    Dilbar Mobiles, Bahria Phase 7<br />
                    Rawalpindi, Pakistan
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold mb-1">Business Hours</h3>
                  <p className="text-sm text-muted-foreground">
                    Mon - Sat: 10:00 AM - 10:00 PM<br />
                    Sunday: 12:00 PM - 8:00 PM
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold mb-1">Contact</h3>
                  <p className="text-sm text-muted-foreground">
                    +92 XXX XXXXXXX<br />
                    WhatsApp Available
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold mb-1">Email</h3>
                  <p className="text-sm text-muted-foreground">
                    info@dilbarmobiles.pk
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary to-primary/80 text-white">
            <CardContent className="p-6 h-full flex flex-col justify-between">
              <div>
                <h3 className="text-2xl font-bold mb-3">Need Help?</h3>
                <p className="text-white/90 mb-6">
                  Get in touch with us for wholesale inquiries, repair services, or product information.
                </p>
              </div>
              
              <div className="space-y-3">
                <Button variant="secondary" className="w-full" size="lg">
                  <Phone className="w-4 h-4 mr-2" />
                  Call Us Now
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full bg-white/10 hover:bg-white/20 text-white border-white/20" 
                  size="lg"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send Message
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};
