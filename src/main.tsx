import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
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

// ====================================================================
// CRITICAL: Remove second scrollbar - active JavaScript solution
// ====================================================================

/**
 * Finds and removes all scroll containers except those that explicitly need them
 */
function removeScrollContainers() {
  // Get all elements in the document
  const allElements = document.querySelectorAll('*');
  
  allElements.forEach((element: Element) => {
    // Skip elements that explicitly need scroll (MiniCart, command dropdowns, etc.)
    const className = element.className || '';
    const hasExplicitOverflow = 
      className.includes('overflow-y-auto') ||
      className.includes('overflow-auto') ||
      className.includes('overflow-y-scroll') ||
      element.getAttribute('data-radix-scroll-area-viewport') ||
      element.getAttribute('data-radix-scroll-area-root');
    
    if (hasExplicitOverflow) {
      return; // Skip elements that need scroll
    }
    
    // Check computed style for overflow-y
    const computedStyle = window.getComputedStyle(element);
    const overflowY = computedStyle.overflowY;
    const height = computedStyle.height;
    const maxHeight = computedStyle.maxHeight;
    
    // If element has scroll or auto overflow, and it's not html/body (which we handle separately)
    if (
      (overflowY === 'auto' || overflowY === 'scroll') &&
      element !== document.documentElement &&
      element !== document.body
    ) {
      // Force remove scroll container using inline style (highest priority)
      (element as HTMLElement).style.setProperty('overflow-y', 'visible', 'important');
      
      // Also remove height constraints that might cause scroll
      if (height === '100vh' || height === '100%' || maxHeight === '100vh' || maxHeight === '100%') {
        (element as HTMLElement).style.setProperty('height', 'auto', 'important');
        (element as HTMLElement).style.setProperty('max-height', 'none', 'important');
      }
    }
  });
  
  // Explicitly handle html, body, and #root
  const html = document.documentElement;
  const body = document.body;
  const root = document.getElementById('root');
  
  [html, body, root].forEach(element => {
    if (element) {
      element.style.setProperty('overflow-y', 'visible', 'important');
      element.style.setProperty('height', 'auto', 'important');
      element.style.setProperty('max-height', 'none', 'important');
    }
  });
}

// Run immediately
removeScrollContainers();

// Run after DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  removeScrollContainers();
  // Also run after a short delay to catch elements created by React
  setTimeout(removeScrollContainers, 100);
  setTimeout(removeScrollContainers, 500);
  setTimeout(removeScrollContainers, 1000);
});

// Run after page is fully loaded
window.addEventListener('load', () => {
  removeScrollContainers();
  setTimeout(removeScrollContainers, 100);
  setTimeout(removeScrollContainers, 500);
});

// Use MutationObserver to watch for dynamically created elements
const observer = new MutationObserver(() => {
  removeScrollContainers();
});

// Start observing after root is created
const rootElement = document.getElementById('root');
if (rootElement) {
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class']
  });
}

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
