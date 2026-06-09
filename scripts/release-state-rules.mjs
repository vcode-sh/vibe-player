export function collectReleaseStateIssues(manifest, changesetConfig) {
  const issues = [];
  if (manifest.name !== "@vibe-code/vibe-player") {
    issues.push('package name must remain "@vibe-code/vibe-player".');
  }
  if (manifest.private !== true) {
    issues.push("package must stay private until the release stance changes.");
  }
  if (manifest.license !== "UNLICENSED") {
    issues.push('license must stay "UNLICENSED" before a public release.');
  }
  if (manifest.publishConfig?.access !== "restricted") {
    issues.push('publishConfig.access must stay "restricted".');
  }
  if (manifest.publishConfig?.provenance !== true) {
    issues.push("publishConfig.provenance must stay true.");
  }
  if (manifest.type !== "module") {
    issues.push('package type must stay "module" for the ESM-only package.');
  }
  if (manifest.module !== "./dist/index.js") {
    issues.push('module must point to "./dist/index.js".');
  }
  if (manifest.types !== "./dist/index.d.ts") {
    issues.push('types must point to "./dist/index.d.ts".');
  }
  if (manifest.exports?.["."]?.import !== "./dist/index.js") {
    issues.push('exports["."].import must point to "./dist/index.js".');
  }
  if (manifest.exports?.["."]?.types !== "./dist/index.d.ts") {
    issues.push('exports["."].types must point to "./dist/index.d.ts".');
  }
  if (manifest.exports?.["./styles.css"] !== "./dist/styles.css") {
    issues.push('exports["./styles.css"] must point to "./dist/styles.css".');
  }
  if (!manifest.sideEffects?.includes("./dist/styles.css")) {
    issues.push('sideEffects must include "./dist/styles.css".');
  }
  if (manifest.packageManager !== "bun@1.3.14") {
    issues.push('packageManager must stay "bun@1.3.14".');
  }
  if (changesetConfig.access !== "restricted") {
    issues.push('Changesets access must stay "restricted".');
  }
  if (changesetConfig.commit !== false) {
    issues.push("Changesets commit must stay false.");
  }
  return issues;
}
