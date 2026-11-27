import path from "node:path";
import { fileURLToPath } from "node:url";
import { getRequestListener } from "@hono/node-server";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import type { Connect, Plugin } from "vite";
import { defineConfig } from "vite";
import app from "./server/app.ts";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Serve Hono /api/* inside Vite so local dev is one process.
 * Avoids 502s when a separate :3848 API dies under concurrently (common on Windows).
 */
function localApiPlugin(): Plugin {
  return {
    name: "biterate-local-api",
    configureServer(server) {
      const handle = getRequestListener(app.fetch);
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith("/api")) {
          next();
          return;
        }
        // Vite may pass URLs with the origin host; keep path for Hono.
        Promise.resolve(handle(req as Connect.IncomingMessage, res)).catch(
          next,
        );
      });
      server.httpServer?.once("listening", () => {
        console.log("[api] BiteRate API mounted at /api (in Vite)");
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), localApiPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "./src"),
      "@shared": path.resolve(rootDir, "./shared"),
    },
  },
  build: {
    target: "es2022",
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes("node_modules/recharts") ||
            id.includes("node_modules/victory-vendor") ||
            id.includes("/d3-")
          ) {
            return "charts";
          }
          if (
            id.includes("node_modules/react-dom") ||
            id.includes("node_modules/react-router") ||
            id.includes("node_modules/react/")
          ) {
            return "react-vendor";
          }
          if (id.includes("node_modules/lucide-react")) {
            return "icons";
          }
        },
      },
    },
  },
  server: {
    port: 3847,
    host: "127.0.0.1",
  },
  // Keep Node deps external if Vite ever SSR-loads the app module.
  ssr: {
    external: ["@hono/node-server"],
  },
  optimizeDeps: {
    exclude: ["@hono/node-server"],
  },
});
