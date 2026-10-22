import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  root: resolve(import.meta.dirname, "fixture"),
  server: { fs: { allow: [resolve(import.meta.dirname, "../..")] } },
});
