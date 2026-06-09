import { afterEach, describe, expect, it, vi } from "vitest";
import { createMediaDeliveryAuditReport } from "./media-delivery-audit-core.mjs";
import {
  createMp4Sample,
  createRangeResponse,
  getOrigin,
} from "./media-delivery-audit-test-helpers.mjs";

const nativeFetch = globalThis.fetch;

describe("media delivery audit credentialed CORS", () => {
  afterEach(() => {
    globalThis.fetch = nativeFetch;
    vi.restoreAllMocks();
  });

  it("requires explicit origin and credentials headers", async () => {
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
    expect(report.findings).toEqual([
      {
        code: "credentialed-cors-missing",
        failure:
          "Credentialed CORS is missing for https://wildcard.example.com",
        nextAction: {
          code: "allow-credentialed-cors-origin",
          detail:
            "Set Access-Control-Allow-Origin to https://wildcard.example.com and Access-Control-Allow-Credentials: true.",
          headers: {
            "Access-Control-Allow-Origin": "https://wildcard.example.com",
            "Access-Control-Allow-Credentials": "true",
          },
          label: "Allow credentialed CORS origin",
          origin: "https://wildcard.example.com",
        },
        origin: "https://wildcard.example.com",
        recommendation:
          'Set Access-Control-Allow-Origin to https://wildcard.example.com and Access-Control-Allow-Credentials: true before using crossOrigin="use-credentials".',
        severity: "error",
        summary:
          "Credentialed CORS is missing for https://wildcard.example.com",
      },
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
