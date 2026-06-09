import { spawnSync } from "node:child_process";

const packedLinePattern = /^packed\s+\S+\s+(.+)$/;
const lineBreakPattern = /\r\n|\r|\n/;

const expectedFiles = [
  "CHANGELOG.md",
  "README.md",
  "dist/index.d.ts",
  "dist/index.js",
  "dist/index.js.map",
  "docs/integration.md",
  "package.json",
  "scripts/audit-media-delivery.mjs",
  "scripts/media-delivery-audit-core.mjs",
  "src/styles/vibe-player-controls.css",
  "src/styles/vibe-player-modal.css",
  "src/styles/vibe-player-preview.css",
  "src/styles/vibe-player-timeline.css",
  "src/styles/vibe-player-youtube-external.css",
  "src/styles/vibe-player.css",
];

function collectPackedFiles(output) {
  const files = [];
  const lines = output.split(lineBreakPattern);
  for (const line of lines) {
    const match = line.match(packedLinePattern);
    const filePath = match?.[1];
    if (filePath) {
      files.push(filePath);
    }
  }
  return files.sort();
}

function collectMissingFiles(actualFiles) {
  const missingFiles = [];
  for (const expectedFile of expectedFiles) {
    if (!actualFiles.includes(expectedFile)) {
      missingFiles.push(expectedFile);
    }
  }
  return missingFiles;
}

function collectExtraFiles(actualFiles) {
  const extraFiles = [];
  for (const actualFile of actualFiles) {
    if (!expectedFiles.includes(actualFile)) {
      extraFiles.push(actualFile);
    }
  }
  return extraFiles;
}

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
  const missingFiles = collectMissingFiles(actualFiles);
  const extraFiles = collectExtraFiles(actualFiles);
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
