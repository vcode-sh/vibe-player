import { describe, expect, it } from "vitest";
import { parseMediaDeliveryAuditArgs } from "./media-delivery-audit-args.mjs";

describe("media delivery audit args", () => {
  it("parses URL, origins, strict JSON, and credentialed CORS mode", () => {
    expect(
      parseMediaDeliveryAuditArgs([
        "https://cdn.example.com/video.mp4",
        "--origin",
        "https://app.example.com",
        "--origin",
        "https://www.example.com",
        "--max-size-mb",
        "500",
        "--credentials",
        "--json",
        "--require-direct-file-ready",
        "--strict",
      ])
    ).toEqual({
      credentials: true,
      help: false,
      json: true,
      maxSizeBytes: 524_288_000,
      origins: ["https://app.example.com", "https://www.example.com"],
      requireDirectFileReady: true,
      strict: true,
      timeoutMs: 30_000,
      url: "https://cdn.example.com/video.mp4",
    });
  });

  it("keeps unrelated switches off when strict mode alone is selected", () => {
    expect(
      parseMediaDeliveryAuditArgs([
        "https://cdn.example.com/video.mp4",
        "--strict",
      ])
    ).toEqual({
      credentials: false,
      help: false,
      json: false,
      maxSizeBytes: null,
      origins: [],
      requireDirectFileReady: false,
      strict: true,
      timeoutMs: 30_000,
      url: "https://cdn.example.com/video.mp4",
    });
  });

  it("supports help without a URL", () => {
    expect(parseMediaDeliveryAuditArgs(["--help"])).toEqual({
      credentials: false,
      help: true,
      json: false,
      maxSizeBytes: null,
      origins: [],
      requireDirectFileReady: false,
      strict: false,
      timeoutMs: 30_000,
      url: "",
    });
  });

  it("rejects invalid argument shapes before network work starts", () => {
    expect(() => parseMediaDeliveryAuditArgs([])).toThrow(
      "Usage: vibe-player-media-audit <url>"
    );
    expect(() =>
      parseMediaDeliveryAuditArgs([
        "https://cdn.example.com/video.mp4",
        "--origin",
      ])
    ).toThrow("--origin requires a value.");
    expect(() =>
      parseMediaDeliveryAuditArgs([
        "https://cdn.example.com/video.mp4",
        "--max-size-mb",
      ])
    ).toThrow("--max-size-mb requires a value.");
    expect(() =>
      parseMediaDeliveryAuditArgs([
        "https://cdn.example.com/video.mp4",
        "--max-size-mb",
        "0",
      ])
    ).toThrow("--max-size-mb must be a positive number.");
    expect(() => parseMediaDeliveryAuditArgs(["--credential"])).toThrow(
      "Unexpected option: --credential"
    );
    expect(() =>
      parseMediaDeliveryAuditArgs([
        "https://cdn.example.com/video.mp4",
        "https://cdn.example.com/extra.mp4",
      ])
    ).toThrow("Unexpected argument: https://cdn.example.com/extra.mp4");
  });
});
