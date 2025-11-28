import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Chunk splitting pro lepší caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-toast',
          ],
          'query-vendor': ['@tanstack/react-query'],
          // Feature chunks
          'shopify': ['./src/lib/shopify'],
          'auth': ['./src/lib/oauth', './src/lib/customerAccountApi'],
        },
      },
    },
    // Tree shaking - použít esbuild (rychlejší, výchozí v Vite)
    minify: 'esbuild',
    // Esbuild automaticky odstraňuje console.log v produkci
    // Optimalizace assetů
    assetsInlineLimit: 4096, // Inline malé obrázky (< 4KB)
    chunkSizeWarningLimit: 1000,
    // Source maps pouze pro development
    sourcemap: mode === 'development',
  },
  // Optimalizace pro produkci
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
    ],
  },
}));
