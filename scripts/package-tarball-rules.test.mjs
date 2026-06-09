import { describe, expect, it } from "vitest";
import {
  collectPackageArchiveIssues,
  collectPackedFiles,
  expectedPackageFiles,
} from "./package-tarball-rules.mjs";

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
    expect(collectPackageArchiveIssues(expectedPackageFiles)).toEqual({
      extraFiles: [],
      missingFiles: [],
    });
  });

  it("flags missing expected files and unexpected archive leaks", () => {
    const actualFiles = expectedPackageFiles
      .filter((filePath) => filePath !== "dist/styles.css")
      .concat("todo/vibe-player.md");

    expect(collectPackageArchiveIssues(actualFiles)).toEqual({
      extraFiles: ["todo/vibe-player.md"],
      missingFiles: ["dist/styles.css"],
    });
  });
});
