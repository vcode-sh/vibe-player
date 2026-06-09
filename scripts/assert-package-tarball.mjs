import { spawnSync } from "node:child_process";
import {
  collectPackageArchiveIssues,
  collectPackedFiles,
} from "./package-tarball-rules.mjs";

function reportList(title, items) {
  if (items.length === 0) {
    return;
  }
  console.error(title);
  for (const item of items) {
    console.error(`- ${item}`);
  }
}

const packResult = spawnSync("bun", ["pm", "pack", "--dry-run"], {
  encoding: "utf8",
});

const packOutput = `${packResult.stdout}${packResult.stderr}`;

if (packResult.status === 0) {
  const actualFiles = collectPackedFiles(packOutput);
  const { extraFiles, missingFiles } = collectPackageArchiveIssues(actualFiles);
  reportList("Missing expected archive files:", missingFiles);
  reportList("Unexpected archive files:", extraFiles);

  if (missingFiles.length > 0 || extraFiles.length > 0) {
    process.exitCode = 1;
  } else {
    console.log(
      `Package archive list is clean with ${actualFiles.length} files.`
    );
  }
} else {
  console.error(packOutput);
  process.exitCode = packResult.status ?? 1;
}
