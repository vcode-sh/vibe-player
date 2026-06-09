const packedLinePattern = /^packed\s+\S+\s+(.+)$/;
const lineBreakPattern = /\r\n|\r|\n/;

export const expectedPackageFiles = [
  "CHANGELOG.md",
  "LICENSE",
  "README.md",
  "dist/index.d.ts",
  "dist/index.js",
  "dist/styles.css",
  "docs/integration.md",
  "docs/media-delivery.md",
  "docs/usage.md",
  "package.json",
  "scripts/audit-media-delivery.mjs",
  "scripts/media-delivery-audit-args.mjs",
  "scripts/media-delivery-audit-cors.mjs",
  "scripts/media-delivery-audit-core.mjs",
  "scripts/media-delivery-audit-fetch.mjs",
  "scripts/media-delivery-audit-findings.mjs",
  "scripts/media-delivery-audit-format.mjs",
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
    if (!expectedPackageFiles.includes(actualFile)) {
      extraFiles.push(actualFile);
    }
  }

  return { extraFiles, missingFiles };
}
