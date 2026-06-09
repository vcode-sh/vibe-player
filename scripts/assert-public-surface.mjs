import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { collectPublicSurfaceIssues } from "./public-surface-rules.mjs";

const declarationPath = resolve(import.meta.dirname, "../dist/index.d.ts");

function reportFailure(title, symbols) {
  console.error(title);
  for (const symbol of symbols) {
    console.error(`- ${symbol}`);
  }
}

const declaration = await readFile(declarationPath, "utf8");
const { leakedSymbols, missingSymbols } =
  collectPublicSurfaceIssues(declaration);

if (missingSymbols.length > 0) {
  reportFailure(
    "Missing expected public symbols in dist/index.d.ts:",
    missingSymbols
  );
}

if (leakedSymbols.length > 0) {
  reportFailure(
    "Unexpected internal symbols leaked into dist/index.d.ts:",
    leakedSymbols
  );
}

if (missingSymbols.length > 0 || leakedSymbols.length > 0) {
  process.exitCode = 1;
} else {
  console.log("Public declaration surface is clean.");
}
