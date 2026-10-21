import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createMediaDeliveryAuditReport,
  formatMediaDeliveryAuditJson,
} from "./media-delivery-audit-core.mjs";
import {
  createMp4Sample,
  createRangeResponse,
} from "./media-delivery-audit-test-helpers.mjs";

const nativeFetch = globalThis.fetch;

describe("media delivery audit size threshold", () => {
  afterEach(() => {
    globalThis.fetch = nativeFetch;
    vi.restoreAllMocks();
  });

  it("flags direct file assets above the configured size limit", async () => {
    const firstBytes = createMp4Sample([
      { size: 32, type: "ftyp" },
      { size: 48, type: "moov" },
      { size: 96, type: "mdat" },
    ]);
    const totalSize = 702_511_504;

    globalThis.fetch = vi.fn(() =>
      createRangeResponse(firstBytes, totalSize, null, null)
    );

    const report = await createMediaDeliveryAuditReport({
      maxSizeBytes: 500 * 1024 * 1024,
      origins: [],
      url: "https://cdn.example.com/large.mp4",
    });

    expect(report.maxSizeBytes).toBe(524_288_000);
    expect(report.failures).toEqual([
      "media file exceeds direct-file size limit",
    ]);
    expect(report.findings).toEqual([
      {
        code: "direct-file-too-large",
        failure: "media file exceeds direct-file size limit",
        nextAction: {
          code: "create-hls-renditions",
          detail:
            "Serve HLS/renditions or reduce the direct-file asset size before rollout.",
          label: "Create streaming renditions",
        },
        recommendation:
          "Serve HLS/renditions or reduce the direct-file asset size before rollout.",
        severity: "error",
        summary:
          "The media file is 702511504 bytes, exceeding the " +
          "524288000 byte direct-file limit.",
      },
    ]);
    expect(report.recommendations).toEqual([
      "Serve HLS/renditions or reduce the direct-file asset size before rollout.",
    ]);
    expect(report.nextActions).toEqual([
      {
        code: "create-hls-renditions",
        detail:
          "Serve HLS/renditions or reduce the direct-file asset size before rollout.",
        label: "Create streaming renditions",
      },
    ]);

    const payload = JSON.parse(formatMediaDeliveryAuditJson(report));
    expect(payload.maxSizeBytes).toBe(524_288_000);
    expect(payload.findings.at(0).code).toBe("direct-file-too-large");
    expect(payload.nextActions.at(0).code).toBe("create-hls-renditions");
  });

  it.each([
    [524_288_000, []],
    [524_288_001, ["direct-file-too-large"]],
  ])(
    "enforces the direct-file byte boundary at %s",
    async (totalSize, codes) => {
      const bytes = createMp4Sample([
        { size: 8, type: "ftyp" },
        { size: 8, type: "moov" },
      ]);
      globalThis.fetch = vi.fn(() => createRangeResponse(bytes, totalSize));
      const report = await createMediaDeliveryAuditReport({
        maxSizeBytes: 524_288_000,
        origins: [],
        url: "https://cdn.example.com/video.mp4",
      });
      expect(report.totalSize).toBe(totalSize);
      expect(report.findings.map((finding) => finding.code)).toEqual(codes);
    }
  );
});
