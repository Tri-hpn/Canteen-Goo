// ============================================================
// vite.config.js — Vite configuration
// ============================================================
// - React plugin
// - Dev server proxy /api → localhost:3000 (tránh CORS)
// - Build optimizations (chunk splitting)
// - Path aliases
// ============================================================

import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig(({ mode }) => {
  // Load .env theo mode
  const env = loadEnv(mode, process.cwd(), "");
  const isProd = mode === "production";

  return {
    // ---------- Plugins ----------
    plugins: [react()],

    // ---------- Resolve ----------
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@components": path.resolve(__dirname, "./src/components"),
        "@pages": path.resolve(__dirname, "./src/pages"),
        "@data": path.resolve(__dirname, "./src/data"),
      },
    },

    // ---------- Dev server ----------
    server: {
      port: 5173,
      host: true, // Cho phép truy cập từ LAN
      strictPort: false,
      open: false,
      proxy: {
        // Dev: proxy /api → Express backend
        "/api": {
          target: env.VITE_BACKEND_URL || "http://localhost:3000",
          changeOrigin: true,
          secure: false,
        },
      },
    },

    // ---------- Preview server ----------
    preview: {
      port: 4173,
      host: true,
    },

    // ---------- Build ----------
    build: {
      outDir: "dist",
      sourcemap: !isProd, // Sourcemap cho dev
      minify: "esbuild",
      target: "es2020",
      chunkSizeWarningLimit: 1000, // kB

      rollupOptions: {
        output: {
          // Tách vendor chunks để cache tốt hơn
          manualChunks: {
            "react-vendor": ["react", "react-dom", "react-router-dom"],
            "chart-vendor": ["recharts"],
            "icon-vendor": ["lucide-react"],
          },

          // Tên file có hash để cache busting
          chunkFileNames: "assets/[name]-[hash].js",
          entryFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash].[ext]",
        },
      },

      // Bỏ console/debugger trong production
      esbuild: isProd
        ? {
            drop: ["console", "debugger"],
          }
        : {},
    },

    // ---------- Optimization ----------
    optimizeDeps: {
      include: ["react", "react-dom", "react-router-dom"],
    },

    // ---------- CSS ----------
    css: {
      devSourcemap: true,
    },

    // ---------- Define global constants ----------
    define: {
      __APP_VERSION__: JSON.stringify(
        process.env.npm_package_version || "1.0.0"
      ),
    },
  };
});