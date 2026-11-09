import { defineConfig } from "tsdown";

const playerModulePattern =
  /src[\\/](?:core|react|ui|captions|skins|preview)[\\/]/;
/**
 * Lazily loaded skins, the opt-in media session and double-tap seek keep their
 * own chunks, off the compact initial path.
 */
const lazyModulePattern =
  /[\\/]vibe-player-(?:chips-skin\.tsx|media-session(?:-[a-z]+)?\.ts|tap-seek\.ts)$/;

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
  // Readable ESM: consumers can review, patch and debug the shipped code.
  // Application bundlers minify it; stable chunk names keep diffs reviewable.
  minify: false,
  outDir: "dist",
  outputOptions: {
    chunkFileNames: "chunks/[name].js",
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
