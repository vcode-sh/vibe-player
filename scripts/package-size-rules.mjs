import { Buffer } from "node:buffer";
import { gzipSync } from "node:zlib";

const kib = 1024;

export const packageSizeBudgets = [
  {
    directory: "dist",
    extension: ".js",
    label: "runtime ESM raw",
    limit: 170 * kib,
    mode: "raw",
  },
  {
    directory: "dist",
    extension: ".js",
    label: "runtime ESM gzip",
    // 2026-11-06: +4 KiB for the compact surface, Glass and the lazy Chips skin.
    limit: 42 * kib,
    mode: "gzip",
  },
  {
    filePath: "dist/styles.css",
    label: "stylesheet raw",
    // 2026-11-06: Glass Capsule styles; gzip stays under its 10 KiB limit.
    limit: 58 * kib,
    mode: "raw",
  },
  {
    filePath: "dist/styles.css",
    label: "stylesheet gzip",
    limit: 10 * kib,
    mode: "gzip",
  },
  {
    filePath: "dist/chips.css",
    label: "chips stylesheet gzip",
    limit: 2 * kib,
    mode: "gzip",
  },
  {
    directory: "dist",
    extension: ".d.ts",
    label: "types raw",
    // 2026-11-06: documented surface, skin and slot types for custom overlays.
    // 2026-11-08: host frame, heatmap, timeline background and watched ranges.
    limit: 76 * kib,
    mode: "raw",
  },
];

export function formatPackageSizeBytes(byteCount) {
  return `${byteCount} B (${(byteCount / kib).toFixed(1)} KiB)`;
}

export function measurePackageSize(source, mode) {
  if (Array.isArray(source)) {
    return source.reduce(
      (total, item) => total + measurePackageSize(item, mode),
      0
    );
  }
  if (mode === "gzip") {
    return gzipSync(source).byteLength;
  }
  return typeof source === "string"
    ? Buffer.byteLength(source)
    : source.byteLength;
}

export function createPackageSizeRow(budget, source) {
  const byteCount = measurePackageSize(source, budget.mode);
  return {
    ...budget,
    byteCount,
    passed: byteCount <= budget.limit,
  };
}

export function collectPackageSizeFailures(rows) {
  return rows.filter((row) => !row.passed);
}
