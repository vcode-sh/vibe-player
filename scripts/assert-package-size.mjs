import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  bundlePackageConsumer,
  partitionPackageConsumerChunks,
} from "./package-consumer-size.mjs";
import {
  collectPackageSizeFailures,
  createPackageSizeRow,
  formatPackageSizeBytes,
  measurePackageSize,
  packageSizeBudgets,
} from "./package-size-rules.mjs";

const rootPath = resolve(import.meta.dirname, "..");

async function inspectBudget(budget) {
  if (budget.filePath) {
    const source = await readFile(resolve(rootPath, budget.filePath));
    return createPackageSizeRow(budget, source);
  }
  const directory = resolve(rootPath, budget.directory);
  const files = await readdir(directory, { recursive: true });
  const sources = await Promise.all(
    files
      .filter((file) => file.endsWith(budget.extension))
      .map((file) => readFile(join(directory, file)))
  );
  return createPackageSizeRow(budget, sources);
}

function reportRows(results) {
  for (const row of results) {
    const status = row.passed ? "ok" : "over";
    console.log(
      `${status} ${row.label}: ${formatPackageSizeBytes(
        row.byteCount
      )} / ${formatPackageSizeBytes(row.limit)}`
    );
  }
}

function summarizeChunks(chunks) {
  const code = chunks.map((chunk) => chunk.code);
  return {
    files: chunks.map((chunk) => chunk.fileName),
    gzipBytes: measurePackageSize(code, "gzip"),
    rawBytes: measurePackageSize(code, "raw"),
  };
}

const rows = await Promise.all(packageSizeBudgets.map(inspectBudget));
const consumer = await bundlePackageConsumer(rootPath, [
  { file: "dist/hook.js", names: ["useVibePlayer"] },
  { file: "dist/compact.js", names: ["VibePlayerCompact"] },
]);
const { initial, deferred } = partitionPackageConsumerChunks(consumer);
rows.push(
  createPackageSizeRow(
    {
      label: "hook + compact initial consumer gzip (React and HLS external)",
      // 2026-11-06: 16,000 -> 18,500 B for the shared compact surface (phase,
      // delayed busy, scrub session, pointer policy) and the Glass skin. The
      // Chips skin is a deferred chunk and is not counted here.
      limit: 18_500,
      mode: "gzip",
    },
    initial.map((chunk) => chunk.code)
  )
);
await writeFile(
  resolve(rootPath, "build/package-sizes.json"),
  `${JSON.stringify(
    {
      budgets: rows,
      consumer: {
        deferred: summarizeChunks(deferred),
        initial: summarizeChunks(initial),
        total: summarizeChunks(consumer),
      },
    },
    null,
    2
  )}\n`
);

const deferredBytes = measurePackageSize(
  deferred.map((chunk) => chunk.code),
  "gzip"
);
console.log(
  `Deferred provider bridges (React and HLS external): ${formatPackageSizeBytes(deferredBytes)} gzip across ${deferred.length} chunks.`
);
const totalBytes = measurePackageSize(
  consumer.map((chunk) => chunk.code),
  "gzip"
);
console.log(
  `Complete compact consumer: ${formatPackageSizeBytes(totalBytes)} gzip.`
);

const failures = collectPackageSizeFailures(rows);
reportRows(rows);

if (failures.length > 0) {
  console.error("Package size audit failed:");
  for (const failure of failures) {
    console.error(
      `- ${failure.label} exceeds ${formatPackageSizeBytes(
        failure.limit
      )} at ${formatPackageSizeBytes(failure.byteCount)}`
    );
  }
  process.exitCode = 1;
} else {
  console.log("Package size audit passed.");
}
