import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  collectPackageSizeFailures,
  createPackageSizeRow,
  formatPackageSizeBytes,
  measurePackageSize,
  packageSizeBudgets,
} from "./package-size-rules.mjs";

describe("package size rules", () => {
  it("keeps the current public package budget list explicit", () => {
    expect(packageSizeBudgets.map((budget) => budget.label)).toEqual([
      "runtime ESM raw",
      "runtime ESM gzip",
      "stylesheet raw",
      "stylesheet gzip",
      "types raw",
    ]);
  });

  it("formats byte counts with binary units", () => {
    expect(formatPackageSizeBytes(1536)).toBe("1536 B (1.5 KiB)");
  });

  it("measures raw and gzip byte counts", () => {
    const source = "export const value = 'vibe-player';";

    expect(measurePackageSize(source, "raw")).toBe(source.length);
    expect(measurePackageSize(source, "gzip")).toBe(
      gzipSync(source).byteLength
    );
  });

  it("marks budget rows and returns only failures", () => {
    const passing = createPackageSizeRow(
      { filePath: "ok.js", label: "ok", limit: 4, mode: "raw" },
      "1234"
    );
    const failing = createPackageSizeRow(
      { filePath: "over.js", label: "over", limit: 3, mode: "raw" },
      "1234"
    );

    expect(passing).toMatchObject({ byteCount: 4, passed: true });
    expect(failing).toMatchObject({ byteCount: 4, passed: false });
    expect(collectPackageSizeFailures([passing, failing])).toEqual([failing]);
  });
});
