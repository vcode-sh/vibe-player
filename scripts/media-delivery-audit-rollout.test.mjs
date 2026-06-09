import { describe, expect, it } from "vitest";
import { createMediaDeliveryRollout } from "./media-delivery-audit-rollout.mjs";

function createFinding(code) {
  return { code, severity: "error" };
}

describe("media delivery audit rollout", () => {
  it("marks clean reports as direct-file ready", () => {
    expect(createMediaDeliveryRollout([])).toEqual({
      blockingFindingCodes: [],
      directFileReady: true,
      recommendedDelivery: "direct-file",
      summary: "Direct-file rollout is ready for the checked origins.",
    });
  });

  it("prefers HLS/renditions when direct media is too large", () => {
    expect(
      createMediaDeliveryRollout([
        createFinding("range-unconfirmed"),
        createFinding("mp4-not-faststart"),
        createFinding("direct-file-too-large"),
        createFinding("cors-missing"),
      ])
    ).toEqual({
      blockingFindingCodes: [
        "range-unconfirmed",
        "mp4-not-faststart",
        "direct-file-too-large",
        "cors-missing",
      ],
      directFileReady: false,
      recommendedDelivery: "hls-renditions",
      summary: "Use HLS/renditions before rollout.",
    });
  });

  it("prefers delivery header fixes before media-format advice", () => {
    expect(
      createMediaDeliveryRollout([
        createFinding("range-unconfirmed"),
        createFinding("mp4-not-faststart"),
      ])
    ).toMatchObject({
      directFileReady: false,
      recommendedDelivery: "fix-delivery-headers",
    });
  });
});
