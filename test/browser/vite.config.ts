import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { credentialMediaServer } from "./credential-media-server.ts";
import { mediaFailureServer } from "./media-failure-server.ts";
import { mediaGlitchServer } from "./media-glitch-server.ts";

export default defineConfig({
  plugins: [
    react(),
    credentialMediaServer(),
    mediaFailureServer(),
    mediaGlitchServer(),
  ],
  root: resolve(import.meta.dirname, "fixture"),
  server: {
    fs: { allow: [resolve(import.meta.dirname, "../..")] },
  },
});
