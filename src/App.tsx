import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Index from "./pages/Index";
import CategoryPage from "./pages/CategoryPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import DynamicProductPage from "./pages/product/[handle]";
import ProfilePage from "./pages/ProfilePage";
import CartPage from "./pages/CartPage";
import AdminPage from "./pages/AdminPage";
import AboutPage from "./pages/AboutPage";
import JewelryCarePage from "./pages/JewelryCarePage";
import ShippingPage from "./pages/ShippingPage";
import ContactPage from "./pages/ContactPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Component to handle scroll restoration - ensures page always starts at top
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Always scroll to top when route changes (navigation)
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    // Ensure page starts at top on initial load/reload (F5)
    window.scrollTo(0, 0);
    
    // Additional safety: scroll to top after a short delay to handle any async rendering
    const timeoutId = setTimeout(() => {
      window.scrollTo(0, 0);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, []); // Empty dependency array means this runs only on mount

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      {/* ScrollToTop component ensures page always starts at top on route changes */}
      <ScrollToTop />
      <Toaster />
      <Sonner />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/nahrdelniky" element={<CategoryPage />} />
        <Route path="/nausnice" element={<CategoryPage />} />
        <Route path="/prsteny" element={<CategoryPage />} />
        <Route path="/naramky" element={<CategoryPage />} />
        <Route path="/produkt/:handle" element={<ProductDetailPage />} />
        <Route path="/product-shopify/:handle" element={<DynamicProductPage />} />
        <Route path="/muj-profil" element={<ProfilePage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/o-nas" element={<AboutPage />} />
        <Route path="/pece-o-sperky" element={<JewelryCarePage />} />
        <Route path="/doprava" element={<ShippingPage />} />
        <Route path="/kontakt" element={<ContactPage />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
