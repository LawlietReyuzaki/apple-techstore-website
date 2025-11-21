import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import Shop from "./pages/Shop";
import SpareParts from "./pages/SpareParts";
import SparePartDetail from "./pages/SparePartDetail";
import ProductDetailPage from "./pages/ProductDetailPage";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import PaymentSubmission from "./pages/PaymentSubmission";
import AccountOrders from "./pages/AccountOrders";
import Wishlist from "./pages/Wishlist";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/spare-parts" element={<SpareParts />} />
          <Route path="/spare-part/:id" element={<SparePartDetail />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/product/:handle" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/payment-submission" element={<PaymentSubmission />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/book-repair" element={<BookRepair />} />
          <Route path="/track-repair" element={<TrackRepair />} />
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
            <Route path="technicians" element={<AdminTechnicians />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
