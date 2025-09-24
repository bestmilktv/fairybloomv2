import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import App from "./App.tsx";
import "./index.css";

// Ensure page always starts at the very top
window.addEventListener('load', () => {
  window.scrollTo(0, 0);
});

// Also ensure scroll position is reset on page navigation
window.addEventListener('beforeunload', () => {
  window.scrollTo(0, 0);
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
