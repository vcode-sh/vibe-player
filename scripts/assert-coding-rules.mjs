import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";

const maxLines = 280;
const lineBreakPattern = /\r\n|\r|\n/;
const scannedExtensions = new Set([
  ".css",
  ".html",
  ".json",
  ".mjs",
  ".ts",
  ".tsx",
]);
const rootFiles = ["biome.json", "package.json", "tsconfig.json"];
const scanRoots = ["scripts", "src", "demo/vite/src"];
const demoFiles = [
  "demo/vite/index.html",
  "demo/vite/tsconfig.json",
  "demo/vite/vite.config.ts",
];

const disallowedPatterns = [
  {
    label: `${"a"}${"ny"} keyword`,
    pattern: new RegExp(`\\b${"a"}${"ny"}\\b`),
  },
  {
    label: `.${"for"}${"Each"}() call`,
    pattern: new RegExp(`\\.${"for"}${"Each"}\\(`),
  },
  {
    label: `${"en"}${"um"} keyword`,
    pattern: new RegExp(`\\b${"en"}${"um"}\\b`),
  },
  {
    label: "non-null assertion",
    pattern: /\w+!([,;.)\]}])/,
  },
];

async function collectFilesFromDir(dirPath) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFilesFromDir(entryPath)));
    } else if (scannedExtensions.has(extname(entry.name))) {
      files.push(entryPath);
    }
  }
  return files;
}

async function collectFiles() {
  const files = [...rootFiles, ...demoFiles];
  for (const root of scanRoots) {
    files.push(...(await collectFilesFromDir(root)));
  }
  return [...new Set(files)].sort();
}

function countLines(source) {
  const lines = source.split(lineBreakPattern);
  return source.endsWith("\n") ? lines.length - 1 : lines.length;
}

function inspectSource(filePath, source) {
  const failures = [];
  const lineCount = countLines(source);
  if (lineCount > maxLines) {
    failures.push(`${filePath}: has ${lineCount} lines; limit is ${maxLines}`);
  }
  const lines = source.split(lineBreakPattern);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    for (const rule of disallowedPatterns) {
      if (rule.pattern.test(line)) {
        failures.push(`${filePath}:${index + 1}: ${rule.label}`);
      }
    }
  }
  return failures;
}

const files = await collectFiles();
const failures = [];

for (const filePath of files) {
  const source = await readFile(filePath, "utf8");
  failures.push(...inspectSource(filePath, source));
}

if (failures.length > 0) {
  console.error("Coding rule audit failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Coding rule audit passed for ${files.length} files.`);
}
