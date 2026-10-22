import { afterEach, describe, expect, it, vi } from "vitest";
import { createMediaDeliveryAuditReport } from "./media-delivery-audit-core.mjs";
import { createMp4Sample } from "./media-delivery-audit-test-helpers.mjs";

const nativeFetch = globalThis.fetch;
const completeTail = {
  length: 4_194_304,
  range: "bytes 1048576-5242879/5242880",
  status: 206,
};
const invalidTails = [
  { ...completeTail, name: "HTTP 200", status: 200 },
  {
    ...completeTail,
    name: "a different starting byte",
    range: "bytes 0-4194303/5242880",
  },
  {
    ...completeTail,
    name: "incomplete range coverage",
    range: "bytes 1048576-5242878/5242880",
  },
  {
    ...completeTail,
    name: "a different asset size",
    range: "bytes 1048576-5242879/5242881",
  },
  { ...completeTail, name: "a missing Content-Range", range: null },
  { ...completeTail, length: 68, name: "a truncated response body" },
];

function createTailResponse(input) {
  const bytes = new Uint8Array(input.length);
  bytes.set(
    createMp4Sample([
      { size: 20, type: "free" },
      { size: 48, type: "moov" },
    ])
  );
  const headers = new Headers();
  if (input.range) {
    headers.set("content-range", input.range);
  }
  return new Response(bytes, { headers, status: input.status });
}

function auditTail(input, faststart = false) {
  const bytes = createMp4Sample([
    { size: 32, type: "ftyp" },
    { size: 96, type: faststart ? "moov" : "mdat" },
  ]);
  globalThis.fetch = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Response(bytes, {
          headers: { "content-range": "bytes 0-127/5242880" },
          status: 206,
        })
    )
    .mockImplementationOnce(() => createTailResponse(input));
  return createMediaDeliveryAuditReport({
    origins: [],
    url: "https://cdn.example.com/video.mp4",
  });
}

describe("media audit tail range evidence", () => {
  afterEach(() => {
    globalThis.fetch = nativeFetch;
    vi.restoreAllMocks();
  });

  it("reports the absolute marker offset only from a complete matching HTTP 206 tail", async () => {
    const report = await auditTail(completeTail);

    expect(report.mp4.tailMoovOffset).toBe(1_048_596);
    expect(report.mp4.faststart).toBe(false);
    expect(report.findings.map(({ code }) => code)).toEqual([
      "mp4-not-faststart",
    ]);
    expect(
      globalThis.fetch.mock.calls.map(([, init]) => init.headers.get("Range"))
    ).toEqual(["bytes=0-4194303", "bytes=1048576-5242879"]);
  });

  it.each(invalidTails)("ignores tail offsets for $name", async (input) => {
    const report = await auditTail(input);

    expect(report.mp4.tailMoovOffset).toBeNull();
    expect(report.rangeOk).toBe(true);
    expect(report.mp4.faststart).toBe(false);
    expect(report.failures).toEqual(["MP4 is not faststart"]);
  });

  it.each(invalidTails)(
    "preserves initial faststart evidence despite $name in the tail",
    async (input) => {
      const report = await auditTail(input, true);

      expect(report.mp4.tailMoovOffset).toBeNull();
      expect(report.mp4.moovBox.offset).toBe(32);
      expect(report.mp4.faststart).toBe(true);
      expect(report.findings).toEqual([]);
      expect(report.rollout.directFileReady).toBe(true);
    }
  );
});
