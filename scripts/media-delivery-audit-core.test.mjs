import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createMediaDeliveryAuditReport,
  formatMediaDeliveryAuditJson,
} from "./media-delivery-audit-core.mjs";
import {
  createMp4Sample,
  createRangeResponse,
  getOrigin,
} from "./media-delivery-audit-test-helpers.mjs";

const nativeFetch = globalThis.fetch;

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
        allowed: true,
        allowOrigin: "https://app.example.com",
        credentialsRequired: false,
        origin: "https://app.example.com",
      },
      {
        allowCredentials: null,
        allowed: false,
        allowOrigin: null,
        credentialsRequired: false,
        origin: "https://missing.example.com",
      },
    ]);
    expect(report.failures).toEqual([
      "MP4 is not faststart",
      "CORS is missing for https://missing.example.com",
    ]);
    expect(report.findings).toEqual([
      {
        code: "mp4-not-faststart",
        failure: "MP4 is not faststart",
        nextAction: {
          code: "remux-faststart-or-hls",
          command:
            "ffmpeg -i input.mp4 -c copy -movflags +faststart output.mp4",
          detail:
            "Run ffmpeg with -movflags +faststart or publish HLS renditions.",
          label: "Move MP4 metadata forward",
        },
        recommendation:
          "Remux MP4 with `ffmpeg -movflags +faststart` or serve HLS renditions.",
        severity: "error",
        summary:
          "The MP4 metadata atom is behind media data, which can delay startup.",
      },
      {
        code: "cors-missing",
        failure: "CORS is missing for https://missing.example.com",
        nextAction: {
          code: "allow-cors-origin",
          detail:
            "Allow https://missing.example.com in Access-Control-Allow-Origin before enabling crossOrigin.",
          headers: {
            "Access-Control-Allow-Origin": "https://missing.example.com",
          },
          label: "Allow media CORS origin",
          origin: "https://missing.example.com",
        },
        origin: "https://missing.example.com",
        recommendation:
          "Allow https://missing.example.com in Access-Control-Allow-Origin before enabling crossOrigin.",
        severity: "error",
        summary: "CORS is missing for https://missing.example.com",
      },
    ]);
    expect(report.recommendations).toEqual([
      "Remux MP4 with `ffmpeg -movflags +faststart` or serve HLS renditions.",
      "Allow https://missing.example.com in Access-Control-Allow-Origin before enabling crossOrigin.",
    ]);
    expect(report.nextActions).toEqual([
      {
        code: "remux-faststart-or-hls",
        command: "ffmpeg -i input.mp4 -c copy -movflags +faststart output.mp4",
        detail:
          "Run ffmpeg with -movflags +faststart or publish HLS renditions.",
        label: "Move MP4 metadata forward",
      },
      {
        code: "allow-cors-origin",
        detail:
          "Allow https://missing.example.com in Access-Control-Allow-Origin before enabling crossOrigin.",
        headers: {
          "Access-Control-Allow-Origin": "https://missing.example.com",
        },
        label: "Allow media CORS origin",
        origin: "https://missing.example.com",
      },
    ]);
    expect(report.rollout).toEqual({
      blockingFindingCodes: ["mp4-not-faststart", "cors-missing"],
      directFileReady: false,
      recommendedDelivery: "faststart-remux-or-hls",
      summary: "Remux the MP4 for faststart or serve HLS.",
    });

    const payload = JSON.parse(formatMediaDeliveryAuditJson(report));
    expect(payload.passed).toBe(false);
    expect(payload.failures).toEqual(report.failures);
    expect(payload.findings).toEqual(report.findings);
    expect(payload.nextActions).toEqual(report.nextActions);
    expect(payload.recommendations).toEqual(report.recommendations);
    expect(payload.resolvedUrl).toBe("https://cdn.example.com/video.mp4");
    expect(payload.rollout).toEqual(report.rollout);
    expect(payload.mp4.mdatBox.offset).toBe(32);
    expect(payload.corsResults.at(1).allowed).toBe(false);
  });
});
