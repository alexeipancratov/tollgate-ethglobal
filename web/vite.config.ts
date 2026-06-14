import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Root is web/. Allow importing the top-level shared/ folder, and proxy the
// /feed WebSocket to the backend gate during development.
export default defineConfig({
  plugins: [react()],
  // Read env from the repo root (one .env for backend, agent, and web)
  envDir: "..",
  server: {
    fs: { allow: [".."] },
    proxy: {
      "/feed": { target: "ws://127.0.0.1:8787", ws: true },
      "/approvals": { target: "http://127.0.0.1:8787" },
    },
  },
});
