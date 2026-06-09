import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  collectPackageSizeFailures,
  createPackageSizeRow,
  formatPackageSizeBytes,
  packageSizeBudgets,
} from "./package-size-rules.mjs";

const rootPath = resolve(import.meta.dirname, "..");

async function inspectBudget(budget) {
  const source = await readFile(resolve(rootPath, budget.filePath));
  return createPackageSizeRow(budget, source);
}

function reportRows(rows) {
  for (const row of rows) {
    const status = row.passed ? "ok" : "over";
    console.log(
      `${status} ${row.label}: ${formatPackageSizeBytes(
        row.byteCount
      )} / ${formatPackageSizeBytes(row.limit)}`
    );
  }
}

const rows = [];
for (const budget of packageSizeBudgets) {
  rows.push(await inspectBudget(budget));
}

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
