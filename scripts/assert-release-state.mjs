import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { collectReleaseStateIssues } from "./release-state-rules.mjs";
import { collectReleaseTagWorkflowIssues } from "./release-tag-workflow-rules.mjs";
import { collectReleaseWorkflowIssues } from "./release-workflow-rules.mjs";

const packageJsonPath = resolve(import.meta.dirname, "../package.json");
const changesetConfigPath = resolve(
  import.meta.dirname,
  "../.changeset/config.json"
);
const releaseWorkflowPath = resolve(
  import.meta.dirname,
  "../.github/workflows/release.yml"
);
const mediaAuditBinPath = resolve(
  import.meta.dirname,
  "./audit-media-delivery.mjs"
);

function reportIssues(failures) {
  if (failures.length === 0) {
    return;
  }
  console.error("Release state audit failed:");
  for (const issue of failures) {
    console.error(`- ${issue}`);
  }
}

const manifest = JSON.parse(await readFile(packageJsonPath, "utf8"));
const changesetConfig = JSON.parse(await readFile(changesetConfigPath, "utf8"));
const mediaAuditBinSource = await readFile(mediaAuditBinPath, "utf8");
const releaseWorkflowSource = await readFile(releaseWorkflowPath, "utf8");
const issues = [
  ...collectReleaseStateIssues(manifest, changesetConfig, {
    mediaAuditBinSource,
  }),
  ...collectReleaseWorkflowIssues(releaseWorkflowSource),
  ...collectReleaseTagWorkflowIssues(releaseWorkflowSource),
];

reportIssues(issues);

if (issues.length > 0) {
  process.exitCode = 1;
} else {
  console.log("Release state audit passed.");
}
