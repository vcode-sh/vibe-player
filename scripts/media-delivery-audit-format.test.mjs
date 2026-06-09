import { describe, expect, it } from "vitest";
import {
  formatMediaDeliveryAuditText,
  formatMediaDeliveryByteSize,
} from "./media-delivery-audit-format.mjs";

function createReport(patch = {}) {
  return {
    corsResults: [],
    credentialsRequired: false,
    failures: [],
    findings: [],
    maxSizeBytes: null,
    mp4: { boxes: [], faststart: true, isMp4: false },
    nextActions: [],
    rangeOk: true,
    recommendations: [],
    rollout: {
      blockingFindingCodes: [],
      directFileReady: true,
      recommendedDelivery: "direct-file",
      summary: "Direct-file rollout is ready for the checked origins.",
    },
    status: 206,
    totalSize: 128,
    url: "https://cdn.example.com/video.mp4",
    ...patch,
  };
}

describe("media delivery audit format", () => {
  it("formats healthy human output without failure sections", () => {
    const text = formatMediaDeliveryAuditText(
      createReport({
        mp4: {
          boxes: [
            { offset: 0, size: 24, type: "ftyp" },
            { offset: 24, size: 96, type: "moov" },
          ],
          faststart: true,
          isMp4: true,
          mdatBox: { offset: 120 },
          moovBox: { offset: 24 },
        },
      })
    );

    expect(text).toContain("Media delivery audit\n");
    expect(text).toContain("HTTP range: ok (206)");
    expect(text).toContain("Content length: 128 bytes");
    expect(text).toContain("Direct size limit: not configured");
    expect(text).toContain("Direct-file ready: yes");
    expect(text).toContain("Recommended delivery: direct-file");
    expect(text).toContain(
      "Rollout summary: Direct-file rollout is ready for the checked origins."
    );
    expect(text).toContain("MP4 boxes: ftyp@0:24, moov@24:96");
    expect(text).toContain("MP4 faststart: ok");
    expect(text).not.toContain("Findings:");
    expect(text).not.toContain("Next actions:");
    expect(text).not.toContain("Recommendations:");
    expect(text.endsWith("\n")).toBe(true);
  });

  it("formats structured findings and truncates box summaries", () => {
    const boxes = Array.from({ length: 9 }, (_value, index) => ({
      offset: index * 10,
      size: 10,
      truncated: index === 7,
      type: `b${index}`,
    }));
    const text = formatMediaDeliveryAuditText(
      createReport({
        corsResults: [
          {
            allowCredentials: "none",
            allowOrigin: null,
            allowed: false,
            origin: "https://app.example.com",
          },
        ],
        failures: ["CORS is missing for https://app.example.com"],
        findings: [
          {
            code: "cors-missing",
            failure: "CORS is missing for https://app.example.com",
            recommendation:
              "Allow https://app.example.com in Access-Control-Allow-Origin before enabling crossOrigin.",
            severity: "error",
          },
        ],
        mp4: { boxes, faststart: false, isMp4: false },
        nextActions: [
          {
            code: "allow-cors-origin",
            detail:
              "Allow https://app.example.com in Access-Control-Allow-Origin before enabling crossOrigin.",
            headers: {
              "Access-Control-Allow-Origin": "https://app.example.com",
            },
            label: "Allow media CORS origin",
            origin: "https://app.example.com",
          },
        ],
        recommendations: [
          "Allow https://app.example.com in Access-Control-Allow-Origin before enabling crossOrigin.",
        ],
        rollout: {
          blockingFindingCodes: ["cors-missing"],
          directFileReady: false,
          recommendedDelivery: "fix-cors",
          summary: "Fix CORS for checked origins before rollout.",
        },
      })
    );

    expect(text).toContain("b7@70:10 truncated");
    expect(text).not.toContain("b8@80:10");
    expect(text).toContain(
      "CORS https://app.example.com: missing (acao=none, acac=none)"
    );
    expect(text).toContain(
      "- [error cors-missing] CORS is missing for https://app.example.com"
    );
    expect(text).toContain("Direct-file ready: no");
    expect(text).toContain("Recommended delivery: fix-cors");
    expect(text).toContain(
      "Rollout summary: Fix CORS for checked origins before rollout."
    );
    expect(text).toContain("Recommendations:");
    expect(text).toContain("Next actions:");
    expect(text).toContain("- [allow-cors-origin] Allow media CORS origin");
    expect(text).toContain(
      "Headers: Access-Control-Allow-Origin: https://app.example.com"
    );
  });

  it("prints optional next-action commands", () => {
    const text = formatMediaDeliveryAuditText(
      createReport({
        nextActions: [
          {
            code: "remux-faststart-or-hls",
            command:
              "ffmpeg -i input.mp4 -c copy -movflags +faststart output.mp4",
            detail:
              "Run ffmpeg with -movflags +faststart or publish HLS renditions.",
            label: "Move MP4 metadata forward",
          },
        ],
      })
    );

    expect(text).toContain(
      "Command: ffmpeg -i input.mp4 -c copy -movflags +faststart output.mp4"
    );
  });

  it("formats byte sizes for human delivery reports", () => {
    const text = formatMediaDeliveryAuditText(
      createReport({
        maxSizeBytes: 524_288_000,
        totalSize: 702_511_504,
      })
    );

    expect(formatMediaDeliveryByteSize(1024)).toBe("1024 bytes (1.0 KiB)");
    expect(text).toContain("Content length: 702511504 bytes (670.0 MiB)");
    expect(text).toContain("Direct size limit: 524288000 bytes (500.0 MiB)");
  });

  it("does not present sampled bytes as known content length", () => {
    const text = formatMediaDeliveryAuditText(
      createReport({
        totalSize: 176,
        totalSizeKnown: false,
      })
    );

    expect(text).toContain("Content length: unknown (sampled 176 bytes)");
  });

  it("includes resolved URL only when redirects changed the target", () => {
    const sameUrlText = formatMediaDeliveryAuditText(createReport());
    const redirectedText = formatMediaDeliveryAuditText(
      createReport({
        resolvedUrl: "https://cdn.example.com/final.mp4",
      })
    );

    expect(sameUrlText).not.toContain("Resolved URL:");
    expect(redirectedText).toContain(
      "Resolved URL: https://cdn.example.com/final.mp4"
    );
  });
});
