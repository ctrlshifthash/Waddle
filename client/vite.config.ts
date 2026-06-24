import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [
    react(),
    // Solana web3 / Privy expect Node globals (Buffer, process, global) in the
    // browser, evaluated before the deps load. This shims them app-wide.
    nodePolyfills({ globals: { Buffer: true, global: true, process: true } }),
  ],
  // Single .env lives at the repo root and serves both client and server.
  envDir: fileURLToPath(new URL("..", import.meta.url)),
  // Keep Vite's cache OUT of node_modules. On hosts that mount node_modules
  // during the build (Railway/Nixpacks), `npm ci` rmdir'ing node_modules/.vite
  // fails with EBUSY. A sibling cache dir sidesteps that entirely.
  cacheDir: fileURLToPath(new URL(".vite-cache", import.meta.url)),
  resolve: {
    alias: {
      "@shared": fileURLToPath(new URL("../shared/index.ts", import.meta.url)),
      "@shared/": fileURLToPath(new URL("../shared/", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // Allow importing the sibling ../shared package which lives outside client/.
    fs: { allow: [".."] },
  },
  optimizeDeps: {
    esbuildOptions: { target: "es2022" },
  },
});
