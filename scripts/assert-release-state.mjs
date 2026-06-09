import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { collectReleaseStateIssues } from "./release-state-rules.mjs";

const packageJsonPath = resolve(import.meta.dirname, "../package.json");
const changesetConfigPath = resolve(
  import.meta.dirname,
  "../.changeset/config.json"
);
const mediaAuditBinPath = resolve(
  import.meta.dirname,
  "./audit-media-delivery.mjs"
);

function reportIssues(issues) {
  if (issues.length === 0) {
    return;
  }
  console.error("Release state audit failed:");
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
}

const manifest = JSON.parse(await readFile(packageJsonPath, "utf8"));
const changesetConfig = JSON.parse(await readFile(changesetConfigPath, "utf8"));
const mediaAuditBinSource = await readFile(mediaAuditBinPath, "utf8");
const issues = collectReleaseStateIssues(manifest, changesetConfig, {
  mediaAuditBinSource,
});

reportIssues(issues);

if (issues.length > 0) {
  process.exitCode = 1;
} else {
  console.log("Release state audit passed.");
}
