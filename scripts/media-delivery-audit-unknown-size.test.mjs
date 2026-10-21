import { afterEach, describe, expect, it, vi } from "vitest";
import { createMediaDeliveryAuditReport } from "./media-delivery-audit-core.mjs";
import { createMp4Sample } from "./media-delivery-audit-test-helpers.mjs";

const nativeFetch = globalThis.fetch;

describe("media delivery audit unknown size behavior", () => {
  afterEach(() => {
    globalThis.fetch = nativeFetch;
    vi.restoreAllMocks();
  });

  it.each([null, "bytes 10-1/20", "bytes 0-16/16"])(
    "does not mistake a partial response length for total size: %s",
    async (contentRange) => {
      const bytes = createMp4Sample([
        { size: 8, type: "ftyp" },
        { size: 8, type: "moov" },
      ]);
      const headers = new Headers({ "content-length": "16" });
      if (contentRange) {
        headers.set("content-range", contentRange);
      }
      globalThis.fetch = vi.fn(
        () => new Response(bytes, { headers, status: 206 })
      );

      const report = await createMediaDeliveryAuditReport({
        maxSizeBytes: 524_288_000,
        origins: [],
        url: "https://cdn.example.com/partial.mp4",
      });

      expect(report.rangeOk).toBe(false);
      expect(report.totalSizeKnown).toBe(false);
      expect(report.totalSize).toBe(16);
      expect(report.findings.map((finding) => finding.code)).toEqual([
        "range-unconfirmed",
        "direct-file-size-unknown",
      ]);
      expect(report.rollout.directFileReady).toBe(false);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    }
  );

  it("fails size-limited direct-file audits when total size is unknown", async () => {
    const firstBytes = createMp4Sample([
      { size: 32, type: "ftyp" },
      { size: 48, type: "moov" },
      { size: 96, type: "mdat" },
    ]);
    const headers = new Headers({
      "content-length": String(firstBytes.length),
      "content-range": `bytes 0-${firstBytes.length - 1}/*`,
    });
    globalThis.fetch = vi.fn(
      () => new Response(firstBytes, { headers, status: 206 })
    );

    const report = await createMediaDeliveryAuditReport({
      maxSizeBytes: 524_288_000,
      origins: [],
      url: "https://cdn.example.com/unknown-size.mp4",
    });

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(report.rangeOk).toBe(true);
    expect(report.totalSize).toBe(firstBytes.length);
    expect(report.totalSizeKnown).toBe(false);
    expect(report.failures).toEqual(["media file size is unknown"]);
    expect(report.findings).toEqual([
      {
        code: "direct-file-size-unknown",
        failure: "media file size is unknown",
        nextAction: {
          code: "expose-content-size",
          detail:
            "Return a complete Content-Range total or Content-Length header.",
          label: "Expose total media size",
        },
        recommendation:
          "Return a complete Content-Range total or Content-Length before enforcing direct-file rollout limits.",
        severity: "error",
        summary:
          "The media file size could not be confirmed for the configured direct-file limit.",
      },
    ]);
    expect(report.nextActions).toEqual([
      {
        code: "expose-content-size",
        detail:
          "Return a complete Content-Range total or Content-Length header.",
        label: "Expose total media size",
      },
    ]);
  });
});
