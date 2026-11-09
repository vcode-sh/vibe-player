import { join, sep } from "node:path";

/**
 * Chunk size, in kB, above which the consumer build warns. The only chunk
 * above Vite's 500 kB default is the full hls.js runtime (about 580 kB
 * minified), which the package imports lazily for HLS sources and which is
 * one third-party module that cannot be split further. Every other chunk
 * stays far below, so a larger one still warns.
 */
export const consumerChunkSizeWarningLimit = 600;

/**
 * The package keeps a `"use client"` directive on every built file for
 * React Server Components. A client-only Vite build cannot preserve it and
 * warns once per file; only those warnings for the installed package are
 * dropped; every other directive or warning still prints.
 * @param {{code?: string, id?: string}} log A Rolldown log.
 * @param {string} directory The packed consumer directory.
 * @returns {boolean}
 */
export function isPackageDirectiveLog(log, directory) {
  const packageDirectory = `${join(directory, "node_modules", "vibe-player")}${sep}`;
  return (
    log.code === "MODULE_LEVEL_DIRECTIVE" &&
    typeof log.id === "string" &&
    log.id.startsWith(packageDirectory)
  );
}

/**
 * Vite build options for the packed consumer app in `directory`.
 * @param {string} directory The packed consumer directory.
 */
export function createConsumerBuildConfig(directory) {
  return {
    build: {
      chunkSizeWarningLimit: consumerChunkSizeWarningLimit,
      emptyOutDir: true,
      outDir: "build",
      rolldownOptions: {
        onLog(level, log, defaultHandler) {
          if (!isPackageDirectiveLog(log, directory)) {
            defaultHandler(level, log);
          }
        },
      },
    },
    configFile: false,
    logLevel: "warn",
    root: directory,
  };
}
