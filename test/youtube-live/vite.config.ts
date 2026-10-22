import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  root: resolve(import.meta.dirname, "fixture"),
  server: { fs: { allow: [resolve(import.meta.dirname, "../..")] } },
});
