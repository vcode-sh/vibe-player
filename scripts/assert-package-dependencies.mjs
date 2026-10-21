import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const packagePath = resolve(import.meta.dirname, "../package.json");

const expectedSections = {
  dependencies: ["entities", "hls.js"],
  devDependencies: [
    "@arethetypeswrong/cli",
    "@biomejs/biome",
    "@changesets/cli",
    "@testing-library/jest-dom",
    "@testing-library/react",
    "@types/react",
    "@types/react-dom",
    "@vitejs/plugin-react",
    "happy-dom",
    "publint",
    "react",
    "react-dom",
    "tsdown",
    "typescript",
    "ultracite",
    "vite",
    "vitest",
  ],
  peerDependencies: ["react", "react-dom"],
};

const forbiddenSections = [
  "bundleDependencies",
  "bundledDependencies",
  "optionalDependencies",
];

function getObjectKeys(value, sectionName, issues) {
  if (value === undefined) {
    return [];
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    issues.push(`${sectionName}: must be an object`);
    return [];
  }
  return Object.keys(value).sort();
}

function collectMissingItems(actualItems, expectedItems) {
  const missingItems = [];
  for (const expectedItem of expectedItems) {
    if (!actualItems.includes(expectedItem)) {
      missingItems.push(expectedItem);
    }
  }
  return missingItems;
}

function collectExtraItems(actualItems, expectedItems) {
  const extraItems = [];
  for (const actualItem of actualItems) {
    if (!expectedItems.includes(actualItem)) {
      extraItems.push(actualItem);
    }
  }
  return extraItems;
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

const manifest = JSON.parse(await readFile(packagePath, "utf8"));
const failures = [];

for (const sectionName of forbiddenSections) {
  if (manifest[sectionName] !== undefined) {
    failures.push(`${sectionName}: must not be present`);
  }
}

for (const [sectionName, expectedItems] of Object.entries(expectedSections)) {
  const actualItems = getObjectKeys(
    manifest[sectionName],
    sectionName,
    failures
  );
  const missingItems = collectMissingItems(actualItems, expectedItems);
  const extraItems = collectExtraItems(actualItems, expectedItems);
  reportList(`${sectionName}: missing expected packages:`, missingItems);
  reportList(`${sectionName}: unexpected packages:`, extraItems);
  failures.push(...missingItems);
  failures.push(...extraItems);
}

if (failures.length > 0) {
  console.error("Package dependency audit failed.");
  process.exitCode = 1;
} else {
  console.log("Package dependency audit passed.");
}
