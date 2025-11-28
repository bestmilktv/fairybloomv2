import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useCart } from "@/contexts/CartContext";
import ErrorBoundary from "@/components/ErrorBoundary";

// Code splitting - lazy loading všech rout
const Index = lazy(() => import("./pages/Index"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const ProductDetailPage = lazy(() => import("./pages/ProductDetailPage"));
const DynamicProductPage = lazy(() => import("./pages/product/[handle]"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const CartPage = lazy(() => import("./pages/CartPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const JewelryCarePage = lazy(() => import("./pages/JewelryCarePage"));
const ShippingPage = lazy(() => import("./pages/ShippingPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Loading component pro Suspense
const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="animate-pulse text-primary">Načítám...</div>
  </div>
);

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

// Component to handle checkout URL cleanup when cart is empty
const CheckoutUrlGuard = () => {
  const { items } = useCart();

  useEffect(() => {
    // Check if we have a checkout URL in sessionStorage but cart is empty
    const checkoutUrl = sessionStorage.getItem('fairybloom-checkout-url');
    if (checkoutUrl && items.length === 0) {
      // Clear the checkout URL since cart is empty
      sessionStorage.removeItem('fairybloom-checkout-url');
    }
  }, [items]);

  return null;
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {/* ScrollToTop component ensures page always starts at top on route changes */}
        <ScrollToTop />
        <CheckoutUrlGuard />
        <Toaster />
        <Sonner />
        <Suspense fallback={<PageLoader />}>
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
        </Suspense>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
