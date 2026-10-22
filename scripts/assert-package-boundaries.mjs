import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { collectPackageBoundaryIssues } from "./package-boundary-rules.mjs";

const sourceExtensions = new Set([".ts", ".tsx"]);
const entries = await readdir("src", { recursive: true, withFileTypes: true });
const paths = entries
  .filter(
    (entry) => !entry.isDirectory() && sourceExtensions.has(extname(entry.name))
  )
  .map((entry) => join(entry.parentPath, entry.name))
  .sort();
const sources = await Promise.all(
  paths.map(async (path) => ({
    path,
    source: await readFile(path, "utf8"),
  }))
);
const issues = await collectPackageBoundaryIssues(sources);

if (issues.length > 0) {
  console.error("Package boundary audit failed:");
  for (const { path, specifier, reason } of issues) {
    console.error(`- ${path}: ${reason}: ${specifier}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Package boundary audit passed for ${paths.length} files.`);
}
