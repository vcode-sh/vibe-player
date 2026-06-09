import { describe, expect, it } from "vitest";
import {
  collectMediaDeliveryFailures,
  collectMediaDeliveryNextActions,
  collectMediaDeliveryRecommendations,
  createMediaDeliveryFindings,
} from "./media-delivery-audit-findings.mjs";

describe("media delivery audit findings", () => {
  it("creates stable structured findings and legacy lists", () => {
    const findings = createMediaDeliveryFindings({
      corsResults: [
        {
          allowed: false,
          credentialsRequired: false,
          origin: "https://app.example.com",
        },
      ],
      mp4: { faststart: false, isMp4: true },
      rangeOk: false,
    });

    expect(findings.map((finding) => finding.code)).toEqual([
      "range-unconfirmed",
      "mp4-not-faststart",
      "cors-missing",
    ]);
    expect(findings.every((finding) => finding.severity === "error")).toBe(
      true
    );
    expect(collectMediaDeliveryFailures(findings)).toEqual([
      "range requests are not confirmed",
      "MP4 is not faststart",
      "CORS is missing for https://app.example.com",
    ]);
    expect(collectMediaDeliveryRecommendations(findings)).toEqual([
      "Enable HTTP byte-range responses for media assets.",
      "Remux MP4 with `ffmpeg -movflags +faststart` or serve HLS renditions.",
      "Allow https://app.example.com in Access-Control-Allow-Origin before enabling crossOrigin.",
    ]);
    expect(collectMediaDeliveryNextActions(findings)).toEqual([
      {
        code: "fix-range-headers",
        detail:
          "Serve 206 Partial Content with Content-Range for media range probes.",
        label: "Fix byte-range headers",
      },
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
          "Allow https://app.example.com in Access-Control-Allow-Origin before enabling crossOrigin.",
        headers: {
          "Access-Control-Allow-Origin": "https://app.example.com",
        },
        label: "Allow media CORS origin",
        origin: "https://app.example.com",
      },
    ]);
  });

  it("stays empty for healthy non-MP4 or faststart media", () => {
    expect(
      createMediaDeliveryFindings({
        corsResults: [{ allowed: true }],
        mp4: { faststart: false, isMp4: false },
        rangeOk: true,
      })
    ).toEqual([]);
    expect(
      createMediaDeliveryFindings({
        corsResults: [],
        mp4: { faststart: true, isMp4: true },
        rangeOk: true,
      })
    ).toEqual([]);
  });
});
