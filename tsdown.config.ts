import { defineConfig } from "tsdown";

const playerModulePattern =
  /src[\\/](?:core|react|ui|captions|skins|preview)[\\/]/;
/**
 * Lazily loaded skins and the opt-in media session keep their own chunks, off
 * the compact initial path.
 */
const lazyModulePattern =
  /[\\/]vibe-player-(?:chips-skin\.tsx|media-session(?:-[a-z]+)?\.ts)$/;

export default defineConfig({
  banner: '"use client";',
  clean: true,
  deps: {
    neverBundle: [/^react(?:-dom)?(?:\/|$)/, /^hls\.js(?:\/|$)/],
  },
  dts: true,
  entry: {
    compact: "src/compact.ts",
    hook: "src/hook.ts",
    index: "src/index.ts",
    stage: "src/stage.ts",
  },
  format: "esm",
  inputOptions: { preserveEntrySignatures: "allow-extension" },
  minify: true,
  outDir: "dist",
  outputOptions: {
    chunkFileNames: "chunks/[name]-[hash].js",
    codeSplitting: {
      groups: [
        {
          includeDependenciesRecursively: false,
          name: "player",
          test: (id) =>
            playerModulePattern.test(id) &&
            !id.endsWith(".d.ts") &&
            !lazyModulePattern.test(id),
        },
      ],
    },
  },
  platform: "neutral",
  target: "es2022",
});
