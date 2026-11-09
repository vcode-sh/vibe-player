import { Buffer } from "node:buffer";
import { gzipSync } from "node:zlib";

const kib = 1024;

export const packageSizeBudgets = [
  {
    directory: "dist",
    extension: ".js",
    label: "runtime ESM raw",
    // 2026-11-09: 170 -> 184 KiB (measured 159,163 B) to restore ~15 % headroom.
    // 2026-11-09: 184 -> 343 KiB (measured 304,651 B, was 154,405 B minified)
    // for readable, unminified ESM; consumer bundlers minify it.
    // 2026-11-09: 343 -> 398 KiB (measured 370,582 B) for 0.8.0 platform, host
    // primitives and accessibility announcements (~+65,900 B).
    limit: 398 * kib,
    mode: "raw",
  },
  {
    directory: "dist",
    extension: ".js",
    label: "runtime ESM gzip",
    // 2026-11-06: +4 KiB for the compact surface, Glass and the lazy Chips skin.
    // 2026-11-08: 42 -> 47 KiB (measured 46,180 B) for the Glide/Curve heatmap
    // preview, seek thumbnails and the lazy Media Session chunk.
    // 2026-11-09: 47 -> 55 KiB (measured 48,349 B) for native seek boundaries
    // and observed-progress buffering; 0.7.0 had left only 16 B of headroom.
    // 2026-11-09: 55 -> 85 KiB (measured 75,260 B, was 47,729 B minified) for
    // readable, unminified ESM.
    // 2026-11-09: 85 -> 101 KiB (measured 93,953 B) for 0.8.0 platform, host
    // primitives and accessibility announcements (~+18,700 B).
    limit: 101 * kib,
    mode: "gzip",
  },
  {
    filePath: "dist/styles.css",
    label: "stylesheet raw",
    // 2026-11-06: Glass Capsule styles; gzip stays under its 10 KiB limit.
    // 2026-11-08: shipped stylesheets are minified (62,314 -> 50,052 B raw).
    // 2026-11-09: 58 -> 62 KiB (measured 53,890 B) to restore ~15 % headroom.
    limit: 62 * kib,
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
    // 2026-11-08: 76 -> 86 KiB (measured 83,531 B) for heatmap variants, seek
    // thumbnails and Media Session options.
    // 2026-11-09: 86 -> 99 KiB (measured 86,316 B) to restore ~15 % headroom.
    limit: 99 * kib,
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

/** Percent of a limit that must stay free before the audit warns. */
export const packageSizeWarningHeadroomPercent = 5;

/**
 * Passing budgets whose free space is below the warning percent of their
 * limit. They do not fail the audit; they signal that a re-base is due soon.
 */
export function collectPackageSizeWarnings(
  rows,
  headroomPercent = packageSizeWarningHeadroomPercent
) {
  return rows.filter(
    (row) =>
      row.passed &&
      (row.limit - row.byteCount) * 100 < row.limit * headroomPercent
  );
}
