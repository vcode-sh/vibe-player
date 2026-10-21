import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const demoRoot = import.meta.dirname;
const packageRoot = resolve(demoRoot, "../..");

function getBuildOutDir(mode: string) {
  return mode === "packaged" ? "build-packaged" : "build";
}

function getResolveConfig(mode: string) {
  if (mode === "packaged") {
    return {};
  }
  return {
    alias: [
      {
        find: "vibe-player/styles.css",
        replacement: resolve(packageRoot, "src/styles/vibe-player.css"),
      },
      {
        find: "vibe-player",
        replacement: resolve(packageRoot, "src/index.ts"),
      },
    ],
  };
}

export default defineConfig(({ mode }) => ({
  build: {
    chunkSizeWarningLimit: 650,
    outDir: getBuildOutDir(mode),
  },
  plugins: [react({ include: resolve(demoRoot, "src/**/*.{ts,tsx}") })],
  resolve: getResolveConfig(mode),
  root: demoRoot,
}));
