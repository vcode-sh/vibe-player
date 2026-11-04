import { afterEach, describe, expect, it, vi } from "vitest";
import { createMediaDeliveryAuditReport } from "./media-delivery-audit-core.mjs";
import { createMp4Sample } from "./media-delivery-audit-test-helpers.mjs";

const nativeFetch = globalThis.fetch;

describe("media delivery audit range behavior", () => {
  afterEach(() => {
    globalThis.fetch = nativeFetch;
    vi.restoreAllMocks();
  });

  it("rejects a partial response that starts after the requested beginning", async () => {
    const bytes = createMp4Sample([
      { size: 32, type: "ftyp" },
      { size: 48, type: "moov" },
    ]);
    globalThis.fetch = vi.fn(
      () =>
        new Response(bytes, {
          headers: { "content-range": "bytes 10-89/100" },
          status: 206,
        })
    );

    const report = await createMediaDeliveryAuditReport({
      origins: [],
      url: "https://cdn.example.com/video.mp4",
    });

    expect(report.rangeOk).toBe(false);
    expect(report.rollout.directFileReady).toBe(false);
    expect(report.failures).toContain("range requests are not confirmed");
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["a truncated body", "bytes 0-79/80", 16],
    ["an empty body", "bytes 0-15/80", 0],
    ["extra bytes beyond the declared range", "bytes 0-7/80", 16],
    ["extra bytes at the prefix limit", "bytes 0-4194303/4194304", 4_194_305],
    [
      "a range beyond the requested prefix",
      "bytes 0-4194304/4194305",
      4_194_305,
    ],
  ])(
    "does not confirm initial range evidence with %s",
    async (_name, range, size) => {
      const bytes = new Uint8Array(size);
      if (size >= 16) {
        bytes.set(
          createMp4Sample([
            { size: 8, type: "ftyp" },
            { size: 8, type: "moov" },
          ])
        );
      }
      globalThis.fetch = vi.fn(
        () =>
          new Response(bytes, {
            headers: { "content-range": range },
            status: 206,
          })
      );

      const report = await createMediaDeliveryAuditReport({
        origins: [],
        url: "https://cdn.example.com/video.mp4",
      });

      expect(report.rangeOk).toBe(false);
      expect(report.failures).toContain("range requests are not confirmed");
      expect(report.rollout.directFileReady).toBe(false);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    }
  );

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
