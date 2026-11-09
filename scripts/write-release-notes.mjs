import { appendFile, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { extractReleaseNotes } from "./release-notes.mjs";

const rootPath = resolve(import.meta.dirname, "..");
const outputFlag = process.argv.indexOf("--output");
const outputPath = outputFlag === -1 ? undefined : process.argv[outputFlag + 1];

if (outputPath === undefined) {
  console.error("Usage: node scripts/write-release-notes.mjs --output <file>");
  process.exit(1);
}

const { version } = JSON.parse(
  await readFile(resolve(rootPath, "package.json"), "utf8")
);
const result = extractReleaseNotes(
  await readFile(resolve(rootPath, "CHANGELOG.md"), "utf8"),
  version
);

if ("issue" in result) {
  console.error(`Release notes are missing: ${result.issue}`);
  console.error(
    "Add the released version's section to CHANGELOG.md before publishing."
  );
  process.exit(1);
}

await writeFile(outputPath, result.notes);
// In GitHub Actions, later steps read the version and tag from this step.
if (process.env.GITHUB_OUTPUT) {
  await appendFile(
    process.env.GITHUB_OUTPUT,
    `version=${version}\ntag=v${version}\n`
  );
}
console.log(`Wrote release notes for ${version} to ${outputPath}.`);
