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
  // OPTIMALIZACE: Odstranění console.log a console.warn v produkci
  // console.error je zachován pro debugging kritických chyb
  esbuild: {
    drop: mode === "production" ? ["console", "debugger"] : [],
    // Případně pro zachování console.error:
    // pure: mode === "production" ? ["console.log", "console.warn", "console.info"] : [],
  },
  build: {
    // Optimalizace pro produkční build
    minify: "esbuild",
    target: "esnext",
    // Rozdělení chunks pro lepší caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk pro React a související knihovny
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // UI knihovny
          "vendor-ui": ["@radix-ui/react-dropdown-menu", "@radix-ui/react-dialog", "@radix-ui/react-select"],
        },
      },
    },
  },
}));
