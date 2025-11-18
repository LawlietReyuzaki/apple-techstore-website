import huaweiPura70 from "@/assets/products/huawei-pura-70.jpg";
import huaweiPura80Pro from "@/assets/products/huawei-pura-80-pro.webp";
import iphone16ProMax from "@/assets/products/iphone-16-pro-max.jpg";
import vivoPhone from "@/assets/brands/vivo.jpg";
import xiaomiPhone from "@/assets/brands/xiaomi-new.jpg";
import oneplusPhone from "@/assets/brands/oneplus.jpg";
import oppoPhone from "@/assets/brands/oppo.jpg";

export interface Device {
  id: string;
  brand: string;
  model: string;
  price: number;
  currency: string;
  description: string;
  keySpecs: string[];
  image: string;
  available: boolean;
}

export const devices: Device[] = [
  // Apple
  {
    id: "iphone-16-pro-max",
    brand: "Apple",
    model: "iPhone 16 Pro Max",
    price: 499999,
    currency: "PKR",
    description: "The ultimate iPhone with titanium design and pro camera system",
    keySpecs: [
      "6.9″ Super Retina XDR Display",
      "A18 Pro Chip",
      "Up to 1TB Storage",
      "Pro Camera System (48MP)",
      "Action Button",
      "Titanium Design"
    ],
    image: iphone16ProMax,
    available: true
  },
  
  // Huawei
  {
    id: "huawei-pura-70",
    brand: "Huawei",
    model: "Pura 70",
    price: 185999,
    currency: "PKR",
    description: "Premium flagship with advanced camera system and stunning display",
    keySpecs: [
      "6.6″ LTPO OLED Display",
      "Kirin 9000S1 Processor",
      "12 GB RAM",
      "Triple Camera (50+13+12 MP)",
      "4,900 mAh Battery",
      "IP68 Water Resistant"
    ],
    image: huaweiPura70,
    available: true
  },
  {
    id: "huawei-pura-80-pro",
    brand: "Huawei",
    model: "Pura 80 Pro",
    price: 259999,
    currency: "PKR",
    description: "Ultra-premium device with cutting-edge technology and exceptional build",
    keySpecs: [
      "6.8″ LTPO OLED Display",
      "12 GB RAM",
      "256/512GB/1TB Storage",
      "5,170 mAh Battery",
      "Triple Rear Camera System",
      "Premium Design"
    ],
    image: huaweiPura80Pro,
    available: true
  },
  
  // Vivo
  {
    id: "vivo-x100",
    brand: "Vivo",
    model: "X100",
    price: 228000,
    currency: "PKR",
    description: "Photography powerhouse with ultra-bright display and flagship performance",
    keySpecs: [
      "6.78″ LTPO AMOLED Display",
      "Up to 16 GB RAM",
      "50 MP Main Camera",
      "Ultra Bright Display",
      "5G Capable",
      "1TB Storage Option"
    ],
    image: vivoPhone,
    available: true
  },
  
  // Xiaomi
  {
    id: "xiaomi-mi-16-ultra",
    brand: "Xiaomi",
    model: "Mi 16 Ultra",
    price: 377999,
    currency: "PKR",
    description: "Ultimate flagship with quad-camera system and massive battery capacity",
    keySpecs: [
      "6.73″ Display",
      "16 GB RAM / 512 GB Storage",
      "Quad Camera (50+50+200+50 MP)",
      "32 MP Front Camera",
      "5,410 mAh Battery",
      "Premium Build Quality"
    ],
    image: xiaomiPhone,
    available: true
  },
  
  // OnePlus
  {
    id: "oneplus-nord-ce",
    brand: "OnePlus",
    model: "Nord CE",
    price: 60000,
    currency: "PKR",
    description: "Value-focused 5G device with balanced performance and sleek design",
    keySpecs: [
      "Lightweight 5G Phone",
      "6/8/12 GB RAM Options",
      "Multiple Storage Variants",
      "Fast Charging",
      "Value Performance",
      "OxygenOS Experience"
    ],
    image: oneplusPhone,
    available: true
  },
  {
    id: "oneplus-16",
    brand: "OnePlus",
    model: "OnePlus 16",
    price: 0,
    currency: "PKR",
    description: "Latest flagship with cutting-edge features and premium performance",
    keySpecs: [
      "Coming Soon",
      "Flagship Performance",
      "Advanced Camera System",
      "Fast Charging Technology",
      "Premium Display",
      "5G Connectivity"
    ],
    image: oneplusPhone,
    available: false
  },
  
  // OPPO
  {
    id: "oppo-reno-13",
    brand: "OPPO",
    model: "Reno 13",
    price: 167999,
    currency: "PKR",
    description: "Stylish mid-range flagship with impressive camera capabilities",
    keySpecs: [
      "6.78″ LTPO OLED Display",
      "12 GB RAM / 256 GB Storage",
      "Triple 50 MP Cameras",
      "Android 15",
      "5G Connectivity",
      "Premium Design"
    ],
    image: oppoPhone,
    available: true
  },
  {
    id: "oppo-reno-12",
    brand: "OPPO",
    model: "Reno 12",
    price: 159999,
    currency: "PKR",
    description: "Feature-rich smartphone with excellent display and camera performance",
    keySpecs: [
      "6.7″ AMOLED Display",
      "MediaTek Dimensity 7300",
      "12 GB RAM / 512 GB Storage",
      "Triple Camera (50+8+2 MP)",
      "5,000 mAh Battery",
      "Android 14"
    ],
    image: oppoPhone,
    available: true
  }
];
