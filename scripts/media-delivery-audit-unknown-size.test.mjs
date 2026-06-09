import { afterEach, describe, expect, it, vi } from "vitest";
import { createMediaDeliveryAuditReport } from "./media-delivery-audit-core.mjs";
import { createMp4Sample } from "./media-delivery-audit-test-helpers.mjs";

const nativeFetch = globalThis.fetch;

describe("media delivery audit unknown size behavior", () => {
  afterEach(() => {
    globalThis.fetch = nativeFetch;
    vi.restoreAllMocks();
  });

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
