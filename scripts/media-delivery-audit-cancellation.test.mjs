import { afterEach, describe, expect, it, vi } from "vitest";
import { createMediaDeliveryAuditReport } from "./media-delivery-audit-core.mjs";
import { runMediaDeliveryAuditCli } from "./media-delivery-audit-runner.mjs";

const nativeFetch = globalThis.fetch;
const url = "https://cdn.example.com/video.mp4";

function createGate() {
  let resolve;
  const promise = new Promise((complete) => {
    resolve = complete;
  });
  return { promise, resolve: (value) => resolve(value) };
}

function createSink() {
  let value = "";
  return {
    read: () => value,
    write: (text) => {
      value += text;
    },
  };
}

describe("media audit cancellation and CLI failure", () => {
  afterEach(() => {
    globalThis.fetch = nativeFetch;
    vi.useRealTimers();
  });

  it("cancels explicitly before a network request starts", async () => {
    const abort = new AbortController();
    abort.abort(new Error("Audit cancelled by host"));
    globalThis.fetch = vi.fn();
    await expect(
      createMediaDeliveryAuditReport({ origins: [], signal: abort.signal, url })
    ).rejects.toThrow("Audit cancelled by host");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("propagates host cancellation while headers are pending", async () => {
    const abort = new AbortController();
    const gate = createGate();
    globalThis.fetch = vi.fn(() => gate.promise);
    const pending = createMediaDeliveryAuditReport({
      origins: ["https://app.example.com"],
      signal: abort.signal,
      url,
    });
    const rejected = expect(pending).rejects.toThrow(
      "Host cancelled this audit"
    );
    abort.abort(new Error("Host cancelled this audit"));
    await rejected;
    expect(globalThis.fetch.mock.calls).toHaveLength(1);
    expect(globalThis.fetch.mock.calls[0][1].signal.aborted).toBe(true);
    gate.resolve(new Response(new Uint8Array([1])));
  });

  it("returns a precise nonzero CLI failure without successful JSON on timeout", async () => {
    vi.useFakeTimers();
    const gate = createGate();
    globalThis.fetch = vi.fn(() => gate.promise);
    const stdout = createSink(),
      stderr = createSink();
    const pending = runMediaDeliveryAuditCli({
      argv: [url, "--timeout-ms", "40", "--json"],
      stderr,
      stdout,
    });
    await vi.advanceTimersByTimeAsync(40);
    gate.resolve(new Response(new Uint8Array([1])));
    expect(await pending).toBe(1);
    expect(stdout.read()).toBe("");
    expect(stderr.read()).toBe("Media delivery audit timed out after 40 ms.\n");
  });

  it("cancels a late response body after a Fetch implementation ignores the deadline", async () => {
    vi.useFakeTimers();
    const gate = createGate();
    const cancelled = createGate();
    const cancel = vi.fn((reason) => cancelled.resolve(reason));
    globalThis.fetch = vi.fn(() => gate.promise);
    const pending = createMediaDeliveryAuditReport({
      origins: [],
      timeoutMs: 40,
      url,
    });
    const rejected = expect(pending).rejects.toMatchObject({
      code: "media-audit-timeout",
    });
    await vi.advanceTimersByTimeAsync(40);
    await rejected;

    const response = new Response(new ReadableStream({ cancel }));
    gate.resolve(response);
    await vi.runAllTimersAsync();

    expect(cancel).toHaveBeenCalledTimes(1);
    expect(await cancelled.promise).toMatchObject({
      code: "media-audit-timeout",
    });
    expect(response.body.locked).toBe(false);
  });
});
