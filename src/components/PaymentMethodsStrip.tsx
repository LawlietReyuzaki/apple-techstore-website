import { Card } from "@/components/ui/card";
import { Banknote } from "lucide-react";
import easypaisaLogo from "@/assets/payment-icons/easypaisa.jpg";
import jazzcashLogo from "@/assets/payment-icons/jazzcash.jpg";
import meezanLogo from "@/assets/payment-icons/meezan-bank.png";
import nayapayLogo from "@/assets/payment-icons/nayapay.jpg";
import tcsLogo from "@/assets/payment-icons/tcs.png";

const paymentMethods = [
  { name: "Easypaisa", logo: easypaisaLogo },
  { name: "JazzCash", logo: jazzcashLogo },
  { name: "Meezan Bank", logo: meezanLogo },
  { name: "NayaPay", logo: nayapayLogo },
  { name: "TCS", logo: tcsLogo },
  { name: "Cash on Delivery", logo: null },
];

export const PaymentMethodsStrip = () => {
  return (
    <div className="bg-muted/30 py-8">
      <div className="container mx-auto px-4">
        <h3 className="text-center text-sm font-semibold text-muted-foreground mb-6">
          WE ACCEPT
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6">
          {paymentMethods.map((method) => (
            <Card
              key={method.name}
              className="p-6 flex flex-col items-center justify-center gap-3 hover:shadow-lg transition-all hover:scale-105 bg-card border-2"
            >
              {method.logo ? (
                <div className="w-full h-20 flex items-center justify-center">
                  <img 
                    src={method.logo} 
                    alt={method.name}
                    className="max-h-20 max-w-full w-auto h-auto object-contain"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="w-full h-20 flex items-center justify-center">
                  <Banknote className="h-16 w-16 text-yellow-600" />
                </div>
              )}
              <span className="text-xs font-semibold text-center text-foreground leading-tight">{method.name}</span>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
