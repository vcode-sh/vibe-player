import { describe, expect, it } from "vitest";
import { parseMediaDeliveryAuditArgs } from "./media-delivery-audit-args.mjs";

const url = "https://cdn.example.com/video.mp4";

describe("media audit deadline arguments", () => {
  it.each(["1", "30000", "600000"])(
    "accepts a bounded integer deadline: %s",
    (value) => {
      expect(
        parseMediaDeliveryAuditArgs([url, "--timeout-ms", value]).timeoutMs
      ).toBe(Number(value));
    }
  );

  it.each(["0", "600001", "1.5", "1e3", "-1", "Infinity", "nope"])(
    "rejects an invalid deadline before network work: %s",
    (value) => {
      expect(() =>
        parseMediaDeliveryAuditArgs([url, "--timeout-ms", value])
      ).toThrow("--timeout-ms must be an integer between 1 and 600000.");
    }
  );

  it("requires an explicit timeout value", () => {
    expect(() => parseMediaDeliveryAuditArgs([url, "--timeout-ms"])).toThrow(
      "--timeout-ms requires a value."
    );
  });
});
