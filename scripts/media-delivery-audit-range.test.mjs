import { afterEach, describe, expect, it, vi } from "vitest";
import { createMediaDeliveryAuditReport } from "./media-delivery-audit-core.mjs";
import { createMp4Sample } from "./media-delivery-audit-test-helpers.mjs";

const nativeFetch = globalThis.fetch;

describe("media delivery audit range behavior", () => {
  afterEach(() => {
    globalThis.fetch = nativeFetch;
    vi.restoreAllMocks();
  });

  it("does not fetch the tail when the server ignores range requests", async () => {
    const firstBytes = createMp4Sample([
      { size: 32, type: "ftyp" },
      { size: 96, type: "mdat" },
    ]);
    globalThis.fetch = vi.fn(
      () =>
        new Response(firstBytes, {
          headers: { "content-length": "702511504" },
          status: 200,
        })
    );

    const report = await createMediaDeliveryAuditReport({
      origins: [],
      url: "https://cdn.example.com/large.mp4",
    });

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(report.rangeOk).toBe(false);
    expect(report.status).toBe(200);
    expect(report.totalSize).toBe(702_511_504);
    expect(report.mp4.tailMoovOffset).toBeNull();
    expect(report.failures).toEqual([
      "range requests are not confirmed",
      "MP4 is not faststart",
    ]);
  });
});
