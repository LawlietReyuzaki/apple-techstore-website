import { Link } from "react-router-dom";
import { ArrowRight, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";

const WHATSAPP_NUMBER = "0334-2228141";
const WHATSAPP_LINK = "https://wa.me/923342228141?text=Hi%2C%20I%27m%20looking%20for%20a%20repair%20part";

/** WhatsApp brand mark (Simple Icons path). */
export const WhatsAppLogo = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

/** Beside the hero: one card — can't find the part? WhatsApp us or send a part request. */
export function PartRequestCard() {
  return (
    <section className="relative h-full min-h-[300px] rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.07] via-card to-primary/[0.12] p-6 md:p-7 flex flex-col overflow-hidden">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-2xl" />
      <span className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
        <Wrench className="h-5 w-5" />
      </span>
      <h3 className="text-xl md:text-[22px] font-extrabold leading-snug text-foreground">
        Can't find the repair part you're looking for?
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Tell us the phone model and the part — we source it and confirm the price on WhatsApp.
      </p>

      <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer"
        className="mt-5 flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm transition-all hover:border-[#25D366]/60 hover:shadow-md">
        <span className="h-10 w-10 rounded-full bg-[#25D366] text-white flex items-center justify-center shrink-0">
          <WhatsAppLogo className="h-5 w-5" />
        </span>
        <span className="leading-tight">
          <span className="block text-[11px] uppercase tracking-wide text-muted-foreground">WhatsApp us</span>
          <span className="block text-lg font-bold text-foreground">{WHATSAPP_NUMBER}</span>
        </span>
        <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
      </a>

      <div className="mt-auto pt-4">
        <Link to="/request-part" className="block">
          <Button className="w-full h-11 text-[15px] font-semibold">Request a Part <ArrowRight className="ml-1.5 h-4 w-4" /></Button>
        </Link>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">Usually answered within minutes · Mon–Sat 10 AM – 10 PM</p>
      </div>
    </section>
  );
}
