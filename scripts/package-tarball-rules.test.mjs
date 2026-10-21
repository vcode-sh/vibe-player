import { describe, expect, it } from "vitest";
import {
  collectPackageArchiveIssues,
  collectPackedFiles,
} from "./package-tarball-rules.mjs";

// Consumer artifacts required by the release policy, independent of the guard.
const consumerArchive = [
  "CHANGELOG.md",
  "LICENSE",
  "README.md",
  "package.json",
  "dist/index.js",
  "dist/index.d.ts",
  "dist/styles.css",
  "docs/integration.md",
  "docs/media-delivery.md",
  "docs/usage.md",
  "scripts/audit-media-delivery.mjs",
  "scripts/media-delivery-audit-args.mjs",
  "scripts/media-delivery-audit-core.mjs",
  "scripts/media-delivery-audit-cors.mjs",
  "scripts/media-delivery-audit-fetch.mjs",
  "scripts/media-delivery-audit-findings.mjs",
  "scripts/media-delivery-audit-format.mjs",
  "scripts/media-delivery-audit-rollout.mjs",
  "scripts/media-delivery-audit-runner.mjs",
];

describe("package tarball rules", () => {
  it("parses dry-run package output into sorted archive files", () => {
    const output = [
      "Total files: 3",
      "packed 123B scripts/media-delivery-audit-core.mjs",
      "packed 456B README.md",
      "packed 789B dist/index.js",
    ].join("\r\n");

    expect(collectPackedFiles(output)).toEqual([
      "README.md",
      "dist/index.js",
      "scripts/media-delivery-audit-core.mjs",
    ]);
  });

  it("accepts the current consumer-facing package archive", () => {
    expect(collectPackageArchiveIssues(consumerArchive)).toEqual({
      extraFiles: [],
      missingFiles: [],
    });
  });

  it("flags missing expected files and unexpected archive leaks", () => {
    const actualFiles = consumerArchive
      .filter((filePath) => filePath !== "dist/styles.css")
      .concat("scratch/local-note.md");

    expect(collectPackageArchiveIssues(actualFiles)).toEqual({
      extraFiles: ["scratch/local-note.md"],
      missingFiles: ["dist/styles.css"],
    });
  });
});
