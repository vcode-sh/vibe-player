const packedLinePattern = /^packed\s+\S+\s+(.+)$/;
const lineBreakPattern = /\r\n|\r|\n/;
const generatedChunkPattern =
  /^dist\/(?:chunks\/)?[A-Za-z0-9_-]+-[A-Za-z0-9_-]{8,}\.(?:js|d\.ts)$/;

export const expectedPackageFiles = [
  "CHANGELOG.md",
  "LICENSE",
  "README.md",
  "dist/index.d.ts",
  "dist/index.js",
  "dist/styles.css",
  "dist/chips.css",
  "dist/hook.js",
  "dist/hook.d.ts",
  "dist/stage.js",
  "dist/stage.d.ts",
  "dist/compact.js",
  "dist/compact.d.ts",
  "docs/integration.md",
  "docs/media-delivery.md",
  "docs/usage.md",
  "package.json",
  "scripts/audit-media-delivery.mjs",
  "scripts/media-delivery-audit-args.mjs",
  "scripts/media-delivery-audit-cors.mjs",
  "scripts/media-delivery-audit-core.mjs",
  "scripts/media-delivery-audit-deadline.mjs",
  "scripts/media-delivery-audit-fetch.mjs",
  "scripts/media-delivery-audit-findings.mjs",
  "scripts/media-delivery-audit-format.mjs",
  "scripts/media-delivery-audit-mp4.mjs",
  "scripts/media-delivery-audit-rollout.mjs",
  "scripts/media-delivery-audit-runner.mjs",
];

export function collectPackedFiles(output) {
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

export function collectPackageArchiveIssues(actualFiles) {
  const missingFiles = [];
  for (const expectedFile of expectedPackageFiles) {
    if (!actualFiles.includes(expectedFile)) {
      missingFiles.push(expectedFile);
    }
  }

  const extraFiles = [];
  for (const actualFile of actualFiles) {
    if (
      !(
        expectedPackageFiles.includes(actualFile) ||
        generatedChunkPattern.test(actualFile)
      )
    ) {
      extraFiles.push(actualFile);
    }
  }

  return { extraFiles, missingFiles };
}
