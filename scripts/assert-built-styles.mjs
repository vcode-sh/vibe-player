import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const packageJsonPath = resolve(import.meta.dirname, "../package.json");
const stylesheetPath = resolve(import.meta.dirname, "../dist/styles.css");
const chipsStylesheetPath = resolve(import.meta.dirname, "../dist/chips.css");
const localImportPattern = /^@import\s+"\.\/[^"]+";/m;
const requiredMarkers = [
  ".vibe-player-caption-overlay",
  ".vibe-player-controls__bottom",
  ".vibe-player-modal",
  ".vibe-player-background-preview",
  ".vibe-player-quality-control",
  ".vibe-player-stage__status",
  ".vibe-player-timeline",
  ".vibe-player-tooltip",
  ".vibe-player-volume-control",
  ".vibe-player-glass",
];

function collectMissingMarkers(source) {
  const missing = [];
  for (const marker of requiredMarkers) {
    if (!source.includes(marker)) {
      missing.push(marker);
    }
  }
  return missing;
}

function reportList(title, items) {
  if (items.length === 0) {
    return;
  }
  console.error(title);
  for (const item of items) {
    console.error(`- ${item}`);
  }
}

function collectPackageStyleIssues(manifest) {
  const issues = [];
  if (manifest.exports?.["./styles.css"] !== "./dist/styles.css") {
    issues.push('exports["./styles.css"] must point to "./dist/styles.css".');
  }
  if (!manifest.sideEffects?.includes("./dist/styles.css")) {
    issues.push('sideEffects must include "./dist/styles.css".');
  }
  if (manifest.exports?.["./chips.css"] !== "./dist/chips.css") {
    issues.push('exports["./chips.css"] must point to "./dist/chips.css".');
  }
  if (!manifest.sideEffects?.includes("./dist/chips.css")) {
    issues.push('sideEffects must include "./dist/chips.css".');
  }
  return issues;
}

const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8"));
const stylesheet = await readFile(stylesheetPath, "utf8");
const chipsStylesheet = await readFile(chipsStylesheetPath, "utf8");
const missingMarkers = collectMissingMarkers(stylesheet);
if (!chipsStylesheet.includes(".vibe-player-chips__chip")) {
  missingMarkers.push("chips.css: .vibe-player-chips__chip");
}
if (stylesheet.includes(".vibe-player-chips__chip")) {
  missingMarkers.push("styles.css must not carry the opt-in chips skin");
}
const hasLocalImports =
  localImportPattern.test(stylesheet) ||
  localImportPattern.test(chipsStylesheet);
const packageStyleIssues = collectPackageStyleIssues(packageJson);

if (hasLocalImports) {
  console.error("Built stylesheet still contains local stylesheet imports.");
}

reportList("Built stylesheet is missing required markers:", missingMarkers);
reportList(
  "Package stylesheet export contract is invalid:",
  packageStyleIssues
);

if (
  hasLocalImports ||
  missingMarkers.length > 0 ||
  packageStyleIssues.length > 0
) {
  process.exitCode = 1;
} else {
  console.log("Built stylesheet is flattened and complete.");
}
