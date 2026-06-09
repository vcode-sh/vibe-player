import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createMediaDeliveryAuditReport,
  formatMediaDeliveryAuditJson,
} from "./media-delivery-audit-core.mjs";

const nativeFetch = globalThis.fetch;

function writeBoxHeader(bytes, offset, size, type) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  view.setUint32(offset, size);
  for (let index = 0; index < type.length; index += 1) {
    bytes[offset + 4 + index] = type.charCodeAt(index);
  }
}

function createMp4Sample(boxes) {
  const totalSize = boxes.reduce((sum, box) => sum + box.size, 0);
  const bytes = new Uint8Array(totalSize);
  let offset = 0;
  for (const box of boxes) {
    writeBoxHeader(bytes, offset, box.size, box.type);
    offset += box.size;
  }
  return bytes;
}

function createRangeResponse(bytes, total, allowOrigin, allowCredentials) {
  const headers = new Headers();
  headers.set("content-range", `bytes 0-${bytes.length - 1}/${total}`);
  if (allowOrigin) {
    headers.set("access-control-allow-origin", allowOrigin);
  }
  if (allowCredentials) {
    headers.set("access-control-allow-credentials", allowCredentials);
  }
  return new Response(bytes, { headers, status: 206 });
}

function getOrigin(init) {
  const headers = init?.headers;
  if (!(headers instanceof Headers)) {
    return null;
  }
  return headers.get("Origin");
}

describe("media delivery audit core", () => {
  afterEach(() => {
    globalThis.fetch = nativeFetch;
    vi.restoreAllMocks();
  });

  it("detects non-faststart MP4 files and missing CORS origins", async () => {
    const firstBytes = createMp4Sample([
      { size: 32, type: "ftyp" },
      { size: 96, type: "mdat" },
    ]);
    const tailBytes = createMp4Sample([{ size: 48, type: "moov" }]);
    const totalSize = 512;

    globalThis.fetch = vi.fn((_url, init) => {
      const origin = getOrigin(init);
      if (origin === "https://app.example.com") {
        return createRangeResponse(new Uint8Array([0]), totalSize, origin);
      }
      if (origin === "https://missing.example.com") {
        return createRangeResponse(new Uint8Array([0]), totalSize, null);
      }
      const range =
        init?.headers instanceof Headers ? init.headers.get("Range") : null;
      return createRangeResponse(
        range === "bytes=0-4194303" ? firstBytes : tailBytes,
        totalSize,
        null
      );
    });

    const report = await createMediaDeliveryAuditReport({
      origins: ["https://app.example.com", "https://missing.example.com"],
      url: "https://cdn.example.com/video.mp4",
    });

    expect(report.rangeOk).toBe(true);
    expect(report.mp4.faststart).toBe(false);
    expect(report.mp4.mdatBox?.offset).toBe(32);
    expect(report.mp4.tailMoovOffset).toBe(0);
    expect(report.credentialsRequired).toBe(false);
    expect(report.corsResults).toEqual([
      {
        allowCredentials: null,
        allowOrigin: "https://app.example.com",
        allowed: true,
        credentialsRequired: false,
        origin: "https://app.example.com",
      },
      {
        allowCredentials: null,
        allowOrigin: null,
        allowed: false,
        credentialsRequired: false,
        origin: "https://missing.example.com",
      },
    ]);
    expect(report.failures).toEqual([
      "MP4 is not faststart",
      "CORS is missing for https://missing.example.com",
    ]);
    expect(report.recommendations).toEqual([
      "Remux MP4 with `ffmpeg -movflags +faststart` or serve HLS renditions.",
      "Allow https://missing.example.com in Access-Control-Allow-Origin before enabling crossOrigin.",
    ]);

    const payload = JSON.parse(formatMediaDeliveryAuditJson(report));
    expect(payload.passed).toBe(false);
    expect(payload.failures).toEqual(report.failures);
    expect(payload.recommendations).toEqual(report.recommendations);
    expect(payload.mp4.mdatBox.offset).toBe(32);
    expect(payload.corsResults.at(1).allowed).toBe(false);
  });

  it("requires explicit origin and credentials headers for credentialed CORS", async () => {
    const firstBytes = createMp4Sample([
      { size: 32, type: "ftyp" },
      { size: 48, type: "moov" },
      { size: 96, type: "mdat" },
    ]);
    const totalSize = 512;

    globalThis.fetch = vi.fn((_url, init) => {
      const origin = getOrigin(init);
      if (origin === "https://wildcard.example.com") {
        return createRangeResponse(new Uint8Array([0]), totalSize, "*", "true");
      }
      if (origin === "https://secure.example.com") {
        return createRangeResponse(
          new Uint8Array([0]),
          totalSize,
          origin,
          "true"
        );
      }
      return createRangeResponse(firstBytes, totalSize, null, null);
    });

    const report = await createMediaDeliveryAuditReport({
      credentials: true,
      origins: ["https://wildcard.example.com", "https://secure.example.com"],
      url: "https://cdn.example.com/video.mp4",
    });

    expect(report.credentialsRequired).toBe(true);
    expect(report.failures).toEqual([
      "Credentialed CORS is missing for https://wildcard.example.com",
    ]);
    expect(report.recommendations).toEqual([
      'Set Access-Control-Allow-Origin to https://wildcard.example.com and Access-Control-Allow-Credentials: true before using crossOrigin="use-credentials".',
    ]);
    expect(report.corsResults).toEqual([
      {
        allowCredentials: "true",
        allowOrigin: "*",
        allowed: false,
        credentialsRequired: true,
        origin: "https://wildcard.example.com",
      },
      {
        allowCredentials: "true",
        allowOrigin: "https://secure.example.com",
        allowed: true,
        credentialsRequired: true,
        origin: "https://secure.example.com",
      },
    ]);
  });
});
