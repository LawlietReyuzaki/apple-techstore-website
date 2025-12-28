import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import ProductDetail from "./pages/ProductDetail";
import BookRepair from "./pages/BookRepair";
import TrackRepair from "./pages/TrackRepair";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Account from "./pages/Account";
import NotFound from "./pages/NotFound";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminRepairs from "./pages/admin/Repairs";
import AdminTechnicians from "./pages/admin/Technicians";
import AdminSettings from "./pages/admin/Settings";
import AdminProducts from "./pages/admin/Products";
import AdminOrders from "./pages/admin/Orders";
import AdminPayments from "./pages/admin/Payments";
import AdminSpareParts from "./pages/admin/SpareParts";
import AdminSparePartsConfig from "./pages/admin/SparePartsConfig";
import AdminShopInventory from "./pages/admin/ShopInventory";
import AdminCategoryManagement from "./pages/admin/CategoryManagement";
import AdminPartRequests from "./pages/admin/PartRequests";
import Shop from "./pages/Shop";
import SpareParts from "./pages/SpareParts";
import SparePartDetail from "./pages/SparePartDetail";
import ProductDetailPage from "./pages/ProductDetailPage";
import ShopItemDetail from "./pages/ShopItemDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import PaymentSubmission from "./pages/PaymentSubmission";
import AccountOrders from "./pages/AccountOrders";
import Wishlist from "./pages/Wishlist";
import UsedPhones from "./pages/UsedPhones";
import Laptops from "./pages/Laptops";
import Accessories from "./pages/Accessories";
import RequestPart from "./pages/RequestPart";
import RequestPartThankYou from "./pages/RequestPartThankYou";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/phones" element={<UsedPhones />} />
          <Route path="/laptops" element={<Laptops />} />
          <Route path="/accessories" element={<Accessories />} />
          <Route path="/accessories/:subcategory" element={<Accessories />} />
          <Route path="/spare-parts" element={<SpareParts />} />
          <Route path="/spare-part/:id" element={<SparePartDetail />} />
          <Route path="/shop-item/:id" element={<ShopItemDetail />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/product/:handle" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/payment-submission" element={<PaymentSubmission />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/book-repair" element={<BookRepair />} />
          <Route path="/track-repair" element={<TrackRepair />} />
          <Route path="/request-part" element={<RequestPart />} />
          <Route path="/request-part/thank-you" element={<RequestPartThankYou />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/account" element={<Account />} />
          <Route path="/account/orders" element={<AccountOrders />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="repairs" element={<AdminRepairs />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="payments" element={<AdminPayments />} />
            <Route path="spare-parts" element={<AdminSpareParts />} />
            <Route path="spare-parts-config" element={<AdminSparePartsConfig />} />
            <Route path="shop-inventory" element={<AdminShopInventory />} />
            <Route path="categories" element={<AdminCategoryManagement />} />
            <Route path="part-requests" element={<AdminPartRequests />} />
            <Route path="technicians" element={<AdminTechnicians />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
