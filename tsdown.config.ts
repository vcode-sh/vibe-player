import { defineConfig } from "tsdown";

const playerModulePattern =
  /src[\\/](?:core|react|ui|captions|skins|preview)[\\/]/;
/**
 * Lazily loaded skins, the opt-in media session and double-tap seek keep their
 * own chunks, off the compact initial path.
 */
const lazyModulePattern =
  /[\\/]vibe-player-(?:chips-skin\.tsx|media-session(?:-[a-z]+)?\.ts|tap-seek\.ts)$/;
/**
 * Entry sources keep their own directive; the banner adds it to every chunk,
 * so drop the source copy to emit exactly one readable directive per file.
 */
const sourceUseClientDirective = /^"use client";\n+/;
const sourceEntryPattern = /[\\/]src[\\/](?:compact|hook|index|stage)\.ts$/;
/**
 * Rolldown cannot keep that source directive once an entry shares chunks and
 * warns for it; the banner restores it on every file and `package:readable`
 * checks there is exactly one, so only this warning is dropped.
 */
function isSourceDirectiveLog(log: { code?: string; id?: string }): boolean {
  return (
    log.code === "MODULE_LEVEL_DIRECTIVE" &&
    log.id !== undefined &&
    sourceEntryPattern.test(log.id)
  );
}

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
  inputOptions: {
    onLog(level, log, defaultHandler) {
      if (!isSourceDirectiveLog(log)) {
        defaultHandler(level, log);
      }
    },
    preserveEntrySignatures: "allow-extension",
  },
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
  plugins: [
    {
      name: "single-use-client-directive",
      renderChunk: (code: string) =>
        sourceUseClientDirective.test(code)
          ? code.replace(sourceUseClientDirective, "")
          : null,
    },
  ],
  // With TypeScript 7 installed, rolldown-plugin-dts emits declarations with
  // its tsgo generator and always prints this notice once; the oxc generator
  // would need isolatedDeclarations. Remove once the TypeScript 7 API is
  // stable or isolatedDeclarations lands.
  suppressWarnings:
    "TypeScript 7.0 does not yet have a stable API and is experimental.",
  target: "es2022",
});
