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
import OrdersPage from "./pages/OrdersPage";
import CartPage from "./pages/CartPage";
import AdminPage from "./pages/AdminPage";
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
        <Route path="/:handle" element={<CategoryPage />} />
        <Route path="/produkt/:handle" element={<ProductDetailPage />} />
        <Route path="/product-shopify/:handle" element={<DynamicProductPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/admin" element={<AdminPage />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
