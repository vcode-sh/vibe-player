import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  bundlePackageConsumer,
  partitionPackageConsumerChunks,
} from "./package-consumer-size.mjs";
import {
  collectPackageSizeFailures,
  collectPackageSizeWarnings,
  createPackageSizeRow,
  formatPackageSizeBytes,
  measurePackageSize,
  packageSizeBudgets,
  packageSizeWarningHeadroomPercent,
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
      // 2026-11-08: 18,500 -> 19,500 B for the detached host frame, the
      // timeline background layer, the opt-in Picture-in-Picture control and
      // watched-range tracking in the controller.
      // 2026-11-08: 19,500 -> 20,500 B (measured 19,463 B, 37 B headroom) for
      // the heatmap preview and seek thumbnails; Media Session is deferred.
      // 2026-11-08: 20,500 -> 22,360 B (measured 21,295 B + 5 %) for seek
      // step, skip buttons, double-tap seek and the compact scrub frame
      // (seek thumbnails without a heatmap).
      // 2026-11-09: 22,360 -> 24,600 B (measured 21,418 B + 15 %) to restore
      // headroom after native seek boundaries.
      limit: 24_600,
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

for (const warning of collectPackageSizeWarnings(rows)) {
  const headroom = warning.limit - warning.byteCount;
  console.warn(
    `warning ${warning.label}: only ${formatPackageSizeBytes(headroom)} headroom left (below ${packageSizeWarningHeadroomPercent} % of ${formatPackageSizeBytes(warning.limit)}); re-base this budget before it fails.`
  );
}

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
