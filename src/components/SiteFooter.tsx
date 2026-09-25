import { Link } from "react-router-dom";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { PaymentMethodsStrip } from "@/components/PaymentMethodsStrip";
import logo from "@/assets/logo.jpg";

const SHOP = [
  { to: "/shop", label: "All Products" },
  { to: "/brands", label: "Shop by Brand" },
  { to: "/parts", label: "Shop by Part" },
  { to: "/phones/price/10000-to-24999", label: "Phones by Price" },
  { to: "/phones", label: "Used Phones" },
  { to: "/accessories", label: "Accessories" },
];
const SERVICES = [
  { to: "/book-repair", label: "Book a Repair" },
  { to: "/track-repair", label: "Track Repair" },
  { to: "/request-part", label: "Request a Part" },
  { to: "/parts/lcd-panels", label: "Screen Replacement" },
  { to: "/parts/batteries", label: "Battery Replacement" },
];
const BRANDS = ["samsung", "apple", "xiaomi", "huawei", "oppo", "vivo", "infinix", "oneplus"];

/** Store-wide footer: brand blurb, shop / services / popular brands links, contact, payment strip. */
export function SiteFooter() {
  return (
    <footer className="mt-12 border-t bg-card text-sm">
      <div className="container py-10 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
        <div className="col-span-2 lg:col-span-1">
          <Link to="/" className="flex items-center gap-2.5 mb-3">
            <img src={logo} alt="AppleTechStore" className="h-10 w-10 rounded-xl" />
            <span className="font-extrabold text-lg text-foreground">AppleTechStore</span>
          </Link>
          <p className="text-muted-foreground leading-relaxed">
            Wholesale phones, genuine spare parts and certified repairs — Bahria Phase 7, Rawalpindi. Cash on delivery nationwide.
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-foreground mb-3">Shop</h4>
          <ul className="space-y-2 text-muted-foreground">
            {SHOP.map((l) => <li key={l.to}><Link to={l.to} className="hover:text-primary">{l.label}</Link></li>)}
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-foreground mb-3">Services</h4>
          <ul className="space-y-2 text-muted-foreground">
            {SERVICES.map((l) => <li key={l.to}><Link to={l.to} className="hover:text-primary">{l.label}</Link></li>)}
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-foreground mb-3">Popular Brands</h4>
          <ul className="space-y-2 text-muted-foreground">
            {BRANDS.map((b) => <li key={b}><Link to={`/brands/${b}`} className="hover:text-primary capitalize">{b}</Link></li>)}
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-foreground mb-3">Contact</h4>
          <ul className="space-y-2 text-muted-foreground">
            <li className="flex items-start gap-2"><MapPin className="h-4 w-4 mt-0.5 text-primary shrink-0" /> Bahria Phase 7, Rawalpindi</li>
            <li className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary shrink-0" /><a href="tel:+923342228141" className="hover:text-primary">0334-2228141</a></li>
            <li className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-primary shrink-0" /><a href="https://wa.me/923200450584" className="hover:text-primary">0320-0450584</a></li>
            <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary shrink-0" /> info@dilbarmart.pk</li>
            <li className="text-xs">Mon–Sat, 10 AM – 10 PM</li>
          </ul>
        </div>
      </div>
      <PaymentMethodsStrip />
      <div className="border-t">
        <div className="container py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} AppleTechStore. All rights reserved.</p>
          <p>Best repair shop in Bahria Phase 7 · Genuine parts · 90-day repair warranty</p>
        </div>
      </div>
    </footer>
  );
}
