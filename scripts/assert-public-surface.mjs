import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { publicRuntimeExports } from "./public-api-exports.mjs";
import {
  collectExportNameIssues,
  collectPublicSurfaceIssues,
} from "./public-surface-rules.mjs";

const distPath = resolve(import.meta.dirname, "../dist");
const declaration = await readFile(resolve(distPath, "index.d.ts"), "utf8");
const runtime = await import(pathToFileURL(resolve(distPath, "index.js")).href);
const surfaces = [
  {
    issues: await collectPublicSurfaceIssues(declaration),
    label: "declaration",
  },
  {
    issues: collectExportNameIssues(Object.keys(runtime), publicRuntimeExports),
    label: "runtime",
  },
];

for (const { label, issues } of surfaces) {
  for (const name of issues.missingSymbols) {
    console.error(`Missing ${label} export: ${name}`);
    process.exitCode = 1;
  }
  for (const name of issues.leakedSymbols) {
    console.error(`Unreviewed ${label} export: ${name}`);
    process.exitCode = 1;
  }
}

if (!process.exitCode) {
  console.log(
    "Public declaration and runtime surfaces match the reviewed API."
  );
}
