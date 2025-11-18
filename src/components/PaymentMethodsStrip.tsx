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
        <h3 className="text-center text-sm font-semibold text-muted-foreground mb-4">
          WE ACCEPT
        </h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {paymentMethods.map((method) => (
            <Card
              key={method.name}
              className="p-4 flex flex-col items-center justify-center gap-2 hover:shadow-md transition-shadow bg-card"
            >
              {method.logo ? (
                <img 
                  src={method.logo} 
                  alt={method.name}
                  className="h-10 w-auto object-contain"
                />
              ) : (
                <Banknote className="h-10 w-10 text-yellow-600" />
              )}
              <span className="text-xs font-medium text-center text-foreground">{method.name}</span>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
