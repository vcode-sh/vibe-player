import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { credentialMediaServer } from "./credential-media-server";

export default defineConfig({
  plugins: [react(), credentialMediaServer()],
  root: resolve(import.meta.dirname, "fixture"),
  server: {
    fs: { allow: [resolve(import.meta.dirname, "../..")] },
  },
});
