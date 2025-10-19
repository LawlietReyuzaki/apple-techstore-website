import { Card } from "@/components/ui/card";
import { CreditCard, Wallet, Banknote, Building2, Truck } from "lucide-react";

const paymentMethods = [
  { name: "Easypaisa", icon: Wallet, color: "text-green-600" },
  { name: "JazzCash", icon: Wallet, color: "text-orange-600" },
  { name: "Meezan Bank", icon: Building2, color: "text-blue-600" },
  { name: "NayaPay", icon: CreditCard, color: "text-purple-600" },
  { name: "TCS", icon: Truck, color: "text-red-600" },
  { name: "Cash on Delivery", icon: Banknote, color: "text-yellow-600" },
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
              className="p-4 flex flex-col items-center justify-center gap-2 hover:shadow-md transition-shadow"
            >
              <method.icon className={`h-6 w-6 ${method.color}`} />
              <span className="text-xs font-medium text-center">{method.name}</span>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
