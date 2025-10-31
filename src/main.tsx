import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { FavoritesProvider } from '@/contexts/FavoritesContext';
import App from "./App.tsx";
import "./index.css";

// Ensure page always starts at the very top - handles page reloads (F5) and initial loads
window.addEventListener('load', () => {
  window.scrollTo(0, 0);
});

// Handle page refresh/reload scenarios
window.addEventListener('beforeunload', () => {
  window.scrollTo(0, 0);
});

// Additional safety for immediate scroll to top on page load
document.addEventListener('DOMContentLoaded', () => {
  window.scrollTo(0, 0);
});

// Handle browser back/forward navigation
window.addEventListener('pageshow', (event) => {
  // If page was loaded from cache (back/forward), ensure scroll to top
  if (event.persisted) {
    window.scrollTo(0, 0);
  }
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <FavoritesProvider>
            <App />
          </FavoritesProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
