import { readdir, readFile } from "node:fs/promises";
import { basename, resolve, sep } from "node:path";
import { collectReadableBuildIssues } from "./readable-build-rules.mjs";

const rootPath = resolve(import.meta.dirname, "..");
const distPath = resolve(rootPath, "dist");
// Mirrors the codeSplitting group names in tsdown.config.ts.
const codeSplittingGroupNames = ["player"];

async function readBuiltFiles() {
  const paths = await readdir(distPath, { recursive: true });
  const files = paths.filter(
    (path) => path.endsWith(".js") || path.endsWith(".d.ts")
  );
  return Promise.all(
    files.map(async (path) => ({
      path: path.split(sep).join("/"),
      source: await readFile(resolve(distPath, path), "utf8"),
    }))
  );
}

async function readSourceModuleNames() {
  const paths = await readdir(resolve(rootPath, "src"), { recursive: true });
  return paths.map((path) => basename(path).split(".")[0]);
}

const files = await readBuiltFiles();
const knownNames = new Set([
  ...(await readSourceModuleNames()),
  ...codeSplittingGroupNames,
]);
const issues = collectReadableBuildIssues(files, knownNames);

if (issues.length > 0) {
  console.error("Readable build audit failed:");
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exitCode = 1;
} else {
  const scripts = files.filter((file) => file.path.endsWith(".js")).length;
  console.log(
    `Readable build audit passed: ${scripts} JS files unminified with one "use client" directive; ${files.length} files with stable names.`
  );
}
