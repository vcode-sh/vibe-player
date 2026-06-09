import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";

const kib = 1024;
const rootPath = resolve(import.meta.dirname, "..");
const budgets = [
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

function formatBytes(byteCount) {
  return `${byteCount} B (${(byteCount / kib).toFixed(1)} KiB)`;
}

async function inspectBudget(budget) {
  const source = await readFile(resolve(rootPath, budget.filePath));
  const byteCount =
    budget.mode === "gzip" ? gzipSync(source).byteLength : source.byteLength;
  return {
    ...budget,
    byteCount,
    passed: byteCount <= budget.limit,
  };
}

function reportRows(rows) {
  for (const row of rows) {
    const status = row.passed ? "ok" : "over";
    console.log(
      `${status} ${row.label}: ${formatBytes(row.byteCount)} / ${formatBytes(
        row.limit
      )}`
    );
  }
}

const rows = [];
for (const budget of budgets) {
  rows.push(await inspectBudget(budget));
}

const failures = rows.filter((row) => !row.passed);
reportRows(rows);

if (failures.length > 0) {
  console.error("Package size audit failed:");
  for (const failure of failures) {
    console.error(
      `- ${failure.label} exceeds ${formatBytes(failure.limit)} at ${formatBytes(
        failure.byteCount
      )}`
    );
  }
  process.exitCode = 1;
} else {
  console.log("Package size audit passed.");
}
