import { afterEach, describe, expect, it, vi } from "vitest";
import { createMediaDeliveryAuditReport } from "./media-delivery-audit-core.mjs";
import {
  createMp4Sample,
  createRangeResponse,
  getOrigin,
} from "./media-delivery-audit-test-helpers.mjs";

const nativeFetch = globalThis.fetch;
const origin = "https://app.example.com";

function auditOriginStatus(status) {
  const bytes = createMp4Sample([
    { size: 8, type: "ftyp" },
    { size: 8, type: "moov" },
  ]);
  globalThis.fetch = vi.fn((_url, init) =>
    getOrigin(init)
      ? new Response(new Uint8Array([0]), {
          headers: { "access-control-allow-origin": "*" },
          status,
        })
      : createRangeResponse(bytes, 16)
  );
  return createMediaDeliveryAuditReport({
    origins: [origin],
    url: "https://cdn.example.com/video.mp4",
  });
}

describe("media audit origin HTTP status", () => {
  afterEach(() => {
    globalThis.fetch = nativeFetch;
    vi.restoreAllMocks();
  });

  it.each([302, 403, 500])(
    "blocks HTTP %s even when the response permits CORS",
    async (status) => {
      const report = await auditOriginStatus(status);

      expect(report.rangeOk).toBe(true);
      expect(report.mp4.faststart).toBe(true);
      expect(report.rollout.directFileReady).toBe(false);
      expect(report.corsResults).toEqual([
        {
          allowCredentials: null,
          allowed: true,
          allowOrigin: "*",
          credentialsRequired: false,
          origin,
          status,
        },
      ]);
      expect(
        report.findings.map(
          ({ code, origin: failedOrigin, status: httpStatus }) => ({
            code,
            origin: failedOrigin,
            status: httpStatus,
          })
        )
      ).toEqual([{ code: "origin-http-error", origin, status }]);
      expect(report.failures).toEqual([`HTTP ${status} for origin ${origin}`]);
      expect(report.rollout).toEqual({
        blockingFindingCodes: ["origin-http-error"],
        directFileReady: false,
        recommendedDelivery: "fix-origin-delivery",
        summary: "Fix HTTP delivery for checked origins before rollout.",
      });
    }
  );

  it.each([200, 206])("accepts HTTP %s with valid CORS", async (status) => {
    const report = await auditOriginStatus(status);

    expect(report.corsResults[0]).toMatchObject({ allowed: true, status });
    expect(report.findings).toEqual([]);
    expect(report.failures).toEqual([]);
    expect(report.rollout.directFileReady).toBe(true);
    expect(report.rollout.recommendedDelivery).toBe("direct-file");
  });
});
