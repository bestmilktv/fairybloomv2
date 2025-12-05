import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect, lazy, Suspense } from "react";
import { useCart } from "@/contexts/CartContext";
import Navigation from "@/components/Navigation";
import ErrorBoundary from "@/components/ErrorBoundary";

// OPTIMALIZACE: Lazy loading stránek - snižuje initial bundle size
// Homepage a NotFound zůstávají statické (kritické pro UX)
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Lazy loaded pages - načtou se až při navigaci
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

// Loading skeleton pro lazy loaded stránky
const PageLoadingFallback = () => (
  <div className="min-h-screen bg-background">
    <Navigation />
    <div className="pt-24 px-6 max-w-7xl mx-auto">
      <div className="animate-pulse space-y-6">
        <div className="h-10 bg-muted rounded-lg w-1/3" />
        <div className="h-5 bg-muted rounded-lg w-2/3" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-muted rounded-2xl h-80" />
          ))}
        </div>
      </div>
    </div>
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

// ACCESSIBILITY: Skip to content link pro klávesnicovou navigaci
const SkipToContent = () => (
  <a 
    href="#main-content" 
    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:shadow-lg focus:outline-none"
  >
    Přeskočit na obsah
  </a>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      {/* ACCESSIBILITY: Skip link pro přeskočení navigace */}
      <SkipToContent />
      {/* ScrollToTop component ensures page always starts at top on route changes */}
      <ScrollToTop />
      <CheckoutUrlGuard />
      <Toaster />
      <Sonner />
      {/* Error Boundary pro graceful error handling */}
      <ErrorBoundary>
        <Suspense fallback={<PageLoadingFallback />}>
          {/* ACCESSIBILITY: Main content wrapper s id pro skip link */}
          <main id="main-content">
          <Routes>
          {/* Homepage - statický import pro okamžité načtení */}
          <Route path="/" element={<Index />} />
          {/* Lazy loaded routes */}
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
          </main>
        </Suspense>
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
