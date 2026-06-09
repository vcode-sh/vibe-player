import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchMediaDeliveryRangeSample,
  parseMediaDeliveryContentLength,
  parseMediaDeliveryContentRange,
} from "./media-delivery-audit-fetch.mjs";

const nativeFetch = globalThis.fetch;

describe("media delivery audit fetch helpers", () => {
  afterEach(() => {
    globalThis.fetch = nativeFetch;
    vi.restoreAllMocks();
  });

  it("parses range and length headers", () => {
    const headers = new Headers({ "content-length": "702511504" });
    expect(parseMediaDeliveryContentLength(headers)).toBe(702_511_504);
    expect(parseMediaDeliveryContentRange("bytes 0-4194303/702511504")).toEqual(
      {
        end: 4_194_303,
        start: 0,
        total: 702_511_504,
      }
    );
    expect(parseMediaDeliveryContentRange("bytes 0-1/*")?.total).toBeNull();
    expect(parseMediaDeliveryContentLength(new Headers())).toBeNull();
  });

  it("caps reads when the server ignores range requests", async () => {
    const body = new Uint8Array(128);
    body.fill(7);
    globalThis.fetch = vi.fn(
      () =>
        new Response(body, {
          headers: { "content-length": String(body.length) },
          status: 200,
        })
    );

    const sample = await fetchMediaDeliveryRangeSample({
      end: 9,
      start: 0,
      url: "https://cdn.example.com/large.mp4",
    });

    expect(sample.status).toBe(200);
    expect(sample.bytes).toHaveLength(10);
    expect(sample.headers.get("content-length")).toBe("128");
    expect(sample.resolvedUrl).toBe("https://cdn.example.com/large.mp4");
    const call = globalThis.fetch.mock.calls.at(0);
    expect(call?.[0]).toBe("https://cdn.example.com/large.mp4");
    expect(call?.[1]?.headers).toBeInstanceOf(Headers);
    expect(call?.[1]?.redirect).toBe("follow");
  });

  it("reports the final URL after redirects", async () => {
    const response = new Response(new Uint8Array([1, 2, 3]), { status: 206 });
    Object.defineProperty(response, "url", {
      value: "https://cdn.example.com/final.mp4",
    });
    globalThis.fetch = vi.fn(() => response);

    const sample = await fetchMediaDeliveryRangeSample({
      end: 2,
      start: 0,
      url: "https://cdn.example.com/redirect.mp4",
    });

    expect(sample.resolvedUrl).toBe("https://cdn.example.com/final.mp4");
  });
});
