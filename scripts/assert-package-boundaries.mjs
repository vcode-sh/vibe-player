import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";

const lineBreakPattern = /\r\n|\r|\n/;
const sourceExtensions = new Set([".ts", ".tsx"]);
const sourceRoots = ["src"];

const importSpecifierPatterns = [
  /\bfrom\s+["']([^"']+)["']/g,
  /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  /\bexport\s+\*\s+from\s+["']([^"']+)["']/g,
];

const forbiddenSpecifierRules = [
  {
    label: "app import alias",
    test: (specifier) =>
      specifier.startsWith("@/") || specifier.startsWith("~/"),
  },
  {
    label: "product app import",
    test: (specifier) => specifier.includes("apps/web"),
  },
  {
    label: "Next.js import",
    test: (specifier) => specifier === "next" || specifier.startsWith("next/"),
  },
];

const forbiddenRuntimeLiterals = ["apps/web"];

async function collectFilesFromDir(dirPath) {
  const entries = await readdir(dirPath, {
    recursive: true,
    withFileTypes: true,
  });
  return entries
    .filter(
      (entry) =>
        !entry.isDirectory() && sourceExtensions.has(extname(entry.name))
    )
    .map((entry) => join(entry.parentPath, entry.name));
}

async function collectSourceFiles() {
  const groups = await Promise.all(sourceRoots.map(collectFilesFromDir));
  return [...new Set(groups.flat())].sort();
}

function collectImportSpecifiers(source) {
  const specifiers = [];
  for (const pattern of importSpecifierPatterns) {
    pattern.lastIndex = 0;
    let match = pattern.exec(source);
    while (match) {
      const [, specifier] = match;
      if (specifier) {
        specifiers.push(specifier);
      }
      match = pattern.exec(source);
    }
  }
  return specifiers;
}

function inspectSpecifiers(filePath, source) {
  const failures = [];
  const specifiers = collectImportSpecifiers(source);
  for (const specifier of specifiers) {
    for (const rule of forbiddenSpecifierRules) {
      if (rule.test(specifier)) {
        failures.push(`${filePath}: ${rule.label}: ${specifier}`);
      }
    }
  }
  return failures;
}

function inspectRuntimeLiterals(filePath, source) {
  const failures = [];
  const lines = source.split(lineBreakPattern);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    for (const literal of forbiddenRuntimeLiterals) {
      if (line.includes(literal)) {
        failures.push(
          `${filePath}:${index + 1}: app runtime literal: ${literal}`
        );
      }
    }
  }
  return failures;
}

const sourceFiles = await collectSourceFiles();
const issuesByFile = await Promise.all(
  sourceFiles.map(async (filePath) => {
    const source = await readFile(filePath, "utf8");
    return [
      ...inspectSpecifiers(filePath, source),
      ...inspectRuntimeLiterals(filePath, source),
    ];
  })
);
const failures = issuesByFile.flat();

if (failures.length > 0) {
  console.error("Package boundary audit failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Package boundary audit passed for ${sourceFiles.length} files.`);
}
