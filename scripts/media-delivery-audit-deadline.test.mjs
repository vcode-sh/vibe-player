import { afterEach, describe, expect, it, vi } from "vitest";
import { createMediaDeliveryAuditReport } from "./media-delivery-audit-core.mjs";
import { createMp4Sample } from "./media-delivery-audit-test-helpers.mjs";

const nativeFetch = globalThis.fetch;
const url = "https://cdn.example.com/video.mp4";

function createGate() {
  let resolve;
  const promise = new Promise((complete) => {
    resolve = complete;
  });
  return { promise, resolve: (value) => resolve(value) };
}

function recordSettlement(promise) {
  const result = { status: "pending", value: null };
  promise.then(
    (value) => Object.assign(result, { status: "fulfilled", value }),
    (value) => Object.assign(result, { status: "rejected", value })
  );
  return result;
}

describe("media audit total deadline", () => {
  afterEach(() => {
    globalThis.fetch = nativeFetch;
    vi.useRealTimers();
  });

  it("aborts stalled headers at the deadline before probing more origins", async () => {
    vi.useFakeTimers();
    const gate = createGate();
    globalThis.fetch = vi.fn(() => gate.promise);
    const pending = createMediaDeliveryAuditReport({
      origins: ["https://app.example.com"],
      timeoutMs: 40,
      url,
    });
    const settlement = recordSettlement(pending);
    try {
      await vi.advanceTimersByTimeAsync(39);
      expect(settlement.status).toBe("pending");
      await vi.advanceTimersByTimeAsync(1);
      expect(settlement.status).toBe("rejected");
      expect(settlement.value).toMatchObject({
        code: "media-audit-timeout",
        message: "Media delivery audit timed out after 40 ms.",
        name: "TimeoutError",
      });
      expect(globalThis.fetch.mock.calls).toHaveLength(1);
      expect(globalThis.fetch.mock.calls[0][1].signal.aborted).toBe(true);
    } finally {
      gate.resolve(new Response(new Uint8Array([1]), { status: 200 }));
      await pending.catch(() => undefined);
    }
  });

  it("cancels a stalled body read instead of returning a partial report", async () => {
    vi.useFakeTimers();
    let streamController;
    const cancel = vi.fn();
    const response = new Response(
      new ReadableStream({
        cancel,
        start(controller) {
          streamController = controller;
        },
      })
    );
    globalThis.fetch = vi.fn(async () => response);
    const pending = createMediaDeliveryAuditReport({
      origins: [],
      timeoutMs: 40,
      url,
    });
    const settlement = recordSettlement(pending);
    try {
      await vi.advanceTimersByTimeAsync(40);
      expect(settlement.status).toBe("rejected");
      expect(settlement.value).toMatchObject({ code: "media-audit-timeout" });
      expect(cancel).toHaveBeenCalledTimes(1);
      expect(response.body.locked).toBe(false);
      expect(globalThis.fetch.mock.calls[0][1].signal.aborted).toBe(true);
    } finally {
      try {
        streamController.close();
      } catch {
        /* Cancellation already closed it. */
      }
      await pending.catch(() => undefined);
    }
  });

  it("uses one cumulative budget for initial, tail and origin probes", async () => {
    vi.useFakeTimers();
    globalThis.fetch = vi.fn(
      (_url, init) =>
        new Promise((resolve, reject) => {
          const timer = setTimeout(
            () =>
              resolve(
                new Response(new Uint8Array([1]), {
                  headers: { "content-range": "bytes 0-0/8" },
                  status: 206,
                })
              ),
            25
          );
          init.signal?.addEventListener(
            "abort",
            () => {
              clearTimeout(timer);
              reject(init.signal.reason);
            },
            { once: true }
          );
        })
    );
    const pending = createMediaDeliveryAuditReport({
      origins: ["https://app.example.com"],
      timeoutMs: 40,
      url,
    });
    const settlement = recordSettlement(pending);
    await vi.advanceTimersByTimeAsync(40);
    expect(settlement.status).toBe("rejected");
    expect(settlement.value).toMatchObject({ code: "media-audit-timeout" });
    expect(
      globalThis.fetch.mock.calls.map(([, init]) => init.headers.get("Range"))
    ).toEqual(["bytes=0-4194303", "bytes=0-7"]);
    await pending.catch(() => undefined);
  });

  it("accepts a valid multi-probe audit inside the budget and clears its timer", async () => {
    vi.useFakeTimers();
    const bytes = createMp4Sample([
      { size: 32, type: "ftyp" },
      { size: 48, type: "moov" },
    ]);
    globalThis.fetch = vi.fn(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve(
                new Response(bytes, {
                  headers: {
                    "access-control-allow-origin": "https://app.example.com",
                    "content-range": "bytes 0-79/80",
                  },
                  status: 206,
                })
              ),
            10
          );
        })
    );
    const pending = createMediaDeliveryAuditReport({
      origins: ["https://app.example.com"],
      timeoutMs: 40,
      url,
    });
    const settlement = recordSettlement(pending);
    await vi.advanceTimersByTimeAsync(29);
    expect(settlement.status).toBe("pending");
    await vi.advanceTimersByTimeAsync(1);
    expect(settlement.status).toBe("fulfilled");
    expect((await pending).rollout.directFileReady).toBe(true);
    expect(globalThis.fetch.mock.calls).toHaveLength(3);
    const signals = globalThis.fetch.mock.calls.map(([, init]) => init.signal);
    expect(signals.every((signal) => signal === signals[0])).toBe(true);
    await vi.advanceTimersByTimeAsync(10);
    expect(signals[0].aborted).toBe(false);
  });

  it("applies the default total deadline without a CLI override", async () => {
    vi.useFakeTimers();
    const gate = createGate();
    globalThis.fetch = vi.fn(() => gate.promise);
    const pending = createMediaDeliveryAuditReport({ origins: [], url });
    const settlement = recordSettlement(pending);
    try {
      await vi.advanceTimersByTimeAsync(29_999);
      expect(settlement.status).toBe("pending");
      await vi.advanceTimersByTimeAsync(1);
      expect(settlement.status).toBe("rejected");
      expect(settlement.value.message).toBe(
        "Media delivery audit timed out after 30000 ms."
      );
    } finally {
      gate.resolve(new Response(new Uint8Array([1])));
      await pending.catch(() => undefined);
    }
  });
});
