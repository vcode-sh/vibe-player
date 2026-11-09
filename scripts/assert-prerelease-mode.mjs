import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { collectPrereleaseModeIssues } from "./prerelease-mode-rules.mjs";

const rootPath = resolve(import.meta.dirname, "..");

async function readPreState() {
  try {
    return JSON.parse(
      await readFile(resolve(rootPath, ".changeset/pre.json"), "utf8")
    );
  } catch (error) {
    if (error?.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

const { version } = JSON.parse(
  await readFile(resolve(rootPath, "package.json"), "utf8")
);
const issues = collectPrereleaseModeIssues(version, await readPreState());

if (issues.length > 0) {
  for (const issue of issues) {
    console.error(issue);
  }
  process.exitCode = 1;
} else {
  console.log(`Version ${version} publishes to the expected npm dist-tag.`);
}
