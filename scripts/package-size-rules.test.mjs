import { describe, expect, it } from "vitest";
import {
  collectPackageSizeFailures,
  createPackageSizeRow,
  formatPackageSizeBytes,
  measurePackageSize,
} from "./package-size-rules.mjs";

describe("package size rules", () => {
  it("formats byte counts with binary units", () => {
    expect(formatPackageSizeBytes(1536)).toBe("1536 B (1.5 KiB)");
  });

  it("measures encoded bytes rather than JavaScript character counts", () => {
    expect(measurePackageSize("ż🎬", "raw")).toBe(6);
    expect(measurePackageSize(new Uint8Array([0, 255, 128]), "raw")).toBe(3);
    // Empty gzip: 10-byte header, 2-byte DEFLATE body, 8-byte trailer.
    expect(measurePackageSize("", "gzip")).toBe(20);
  });

  it("accepts the exact byte limit and rejects the next byte", () => {
    const budget = {
      filePath: "asset.js",
      label: "asset",
      limit: 6,
      mode: "raw",
    };
    const passing = createPackageSizeRow(budget, "ż🎬");
    const failing = createPackageSizeRow(budget, "ż🎬!");

    expect(passing).toMatchObject({ byteCount: 6, passed: true });
    expect(failing).toMatchObject({ byteCount: 7, passed: false });
    expect(collectPackageSizeFailures([passing, failing])).toEqual([failing]);
  });
});
