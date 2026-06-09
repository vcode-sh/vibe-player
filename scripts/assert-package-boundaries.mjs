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
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFilesFromDir(entryPath)));
    } else if (sourceExtensions.has(extname(entry.name))) {
      files.push(entryPath);
    }
  }
  return files;
}

async function collectSourceFiles() {
  const files = [];
  for (const root of sourceRoots) {
    files.push(...(await collectFilesFromDir(root)));
  }
  return files.sort();
}

function collectImportSpecifiers(source) {
  const specifiers = [];
  for (const pattern of importSpecifierPatterns) {
    pattern.lastIndex = 0;
    let match = pattern.exec(source);
    while (match) {
      const specifier = match[1];
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
const failures = [];

for (const filePath of sourceFiles) {
  const source = await readFile(filePath, "utf8");
  failures.push(...inspectSpecifiers(filePath, source));
  failures.push(...inspectRuntimeLiterals(filePath, source));
}

if (failures.length > 0) {
  console.error("Package boundary audit failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Package boundary audit passed for ${sourceFiles.length} files.`);
}
