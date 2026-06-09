import { Buffer } from "node:buffer";
import { gzipSync } from "node:zlib";

const kib = 1024;

export const packageSizeBudgets = [
  {
    filePath: "dist/index.js",
    label: "runtime ESM raw",
    limit: 170 * kib,
    mode: "raw",
  },
  {
    filePath: "dist/index.js",
    label: "runtime ESM gzip",
    limit: 36 * kib,
    mode: "gzip",
  },
  {
    filePath: "dist/styles.css",
    label: "stylesheet raw",
    limit: 48 * kib,
    mode: "raw",
  },
  {
    filePath: "dist/styles.css",
    label: "stylesheet gzip",
    limit: 10 * kib,
    mode: "gzip",
  },
  {
    filePath: "dist/index.d.ts",
    label: "types raw",
    limit: 48 * kib,
    mode: "raw",
  },
];

export function formatPackageSizeBytes(byteCount) {
  return `${byteCount} B (${(byteCount / kib).toFixed(1)} KiB)`;
}

export function measurePackageSize(source, mode) {
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
