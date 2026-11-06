import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { hostMediaServer } from "./host-media-server";

export default defineConfig({
  plugins: [react(), hostMediaServer()],
  root: resolve(import.meta.dirname, "fixture"),
  server: {
    fs: { allow: [resolve(import.meta.dirname, "../..")] },
  },
});
