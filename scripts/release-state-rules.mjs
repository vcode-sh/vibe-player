const expectedRepositoryUrl = "git+https://github.com/vcode-sh/vibe-player.git";
const expectedIssuesUrl = "https://github.com/vcode-sh/vibe-player/issues";
const expectedHomepage = "https://github.com/vcode-sh/vibe-player#readme";
const expectedMediaAuditBin = "scripts/audit-media-delivery.mjs";
const bunVersionPattern = /^bun@\d+\.\d+\.\d+$/;
const expectedAuthor = {
  email: "hello@vcode.sh",
  name: "Vibe Code",
  url: "https://x.com/vcode_sh",
};

function collectMediaAuditBinIssues(manifest, packageFiles) {
  const issues = [];
  if (manifest.bin?.["vibe-player-media-audit"] !== expectedMediaAuditBin) {
    issues.push("media audit bin must point to the packaged CLI entrypoint.");
  }
  if (!packageFiles.mediaAuditBinSource?.startsWith("#!/usr/bin/env node\n")) {
    issues.push("media audit bin must use a Node shebang for npm publishing.");
  }
  return issues;
}

function collectManifestIdentityIssues(manifest) {
  const issues = [];
  if (manifest.name !== "vibe-player") {
    issues.push('package name must remain "vibe-player".');
  }
  if ("private" in manifest) {
    issues.push("package manifest must not set private for public release.");
  }
  if (manifest.license !== "Apache-2.0") {
    issues.push('license must stay "Apache-2.0" for public release.');
  }
  if (manifest.author?.name !== expectedAuthor.name) {
    issues.push("author.name must identify Vibe Code.");
  }
  if (manifest.author?.email !== expectedAuthor.email) {
    issues.push("author.email must point to hello@vcode.sh.");
  }
  if (manifest.author?.url !== expectedAuthor.url) {
    issues.push("author.url must point to the Vibe Code profile.");
  }
  if (manifest.funding?.url !== "https://github.com/sponsors/vcode-sh") {
    issues.push("funding.url must point to the Vibe Code sponsor profile.");
  }
  return issues;
}

function collectPackageMetadataIssues(manifest) {
  const issues = [];
  if (manifest.repository?.type !== "git") {
    issues.push('repository.type must stay "git".');
  }
  if (manifest.repository?.url !== expectedRepositoryUrl) {
    issues.push("repository.url must match the package GitHub repository.");
  }
  if (manifest.bugs?.url !== expectedIssuesUrl) {
    issues.push("bugs.url must point to the package issue tracker.");
  }
  if (manifest.homepage !== expectedHomepage) {
    issues.push("homepage must point to the package README.");
  }
  if (manifest.publishConfig?.access !== "public") {
    issues.push('publishConfig.access must stay "public".');
  }
  if (manifest.publishConfig?.provenance !== true) {
    issues.push("publishConfig.provenance must stay true for public release.");
  }
  return issues;
}

function collectEntrypointIssues(manifest) {
  const issues = [];
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
  if (!bunVersionPattern.test(manifest.packageManager ?? "")) {
    issues.push("packageManager must pin an exact Bun version.");
  }
  return issues;
}

function collectChangesetIssues(changesetConfig) {
  const issues = [];
  if (changesetConfig.access !== "public") {
    issues.push('Changesets access must stay "public".');
  }
  if (changesetConfig.commit !== false) {
    issues.push("Changesets commit must stay false.");
  }
  return issues;
}

export function collectReleaseStateIssues(
  manifest,
  changesetConfig,
  packageFiles = {}
) {
  return [
    ...collectManifestIdentityIssues(manifest),
    ...collectPackageMetadataIssues(manifest),
    ...collectEntrypointIssues(manifest),
    ...collectMediaAuditBinIssues(manifest, packageFiles),
    ...collectChangesetIssues(changesetConfig),
  ];
}
