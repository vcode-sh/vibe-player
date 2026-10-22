import { createServer } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMediaDeliveryAuditReport } from "./media-delivery-audit-core.mjs";

const nativeFetch = globalThis.fetch;
const servers = [];

function createGate() {
  let resolve;
  const promise = new Promise((complete) => {
    resolve = complete;
  });
  return { promise, resolve: () => resolve() };
}

async function createStalledServer(bodyStarted) {
  const received = createGate(),
    closed = createGate();
  const server = createServer((_request, response) => {
    response.on("close", () => closed.resolve());
    if (bodyStarted) {
      response.writeHead(200, { "content-type": "video/mp4" });
      response.write(new Uint8Array([1]));
      response.flushHeaders();
    }
    received.resolve();
  });
  servers.push(server);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    closed,
    received,
    url: `http://127.0.0.1:${server.address().port}/video.mp4`,
  };
}

describe("media audit HTTP cancellation", () => {
  afterEach(async () => {
    globalThis.fetch = nativeFetch;
    vi.useRealTimers();
    await Promise.all(
      servers.splice(0).map((server) => {
        server.closeAllConnections();
        return new Promise((resolve) => server.close(resolve));
      })
    );
  });

  it.each([false, true])(
    "closes a real request stalled with body started=%s",
    async (bodyStarted) => {
      const fixture = await createStalledServer(bodyStarted);
      const headersReceived = createGate();
      vi.useFakeTimers();
      globalThis.fetch = vi.fn(async (...args) => {
        const response = await nativeFetch(...args);
        headersReceived.resolve();
        return response;
      });
      const pending = createMediaDeliveryAuditReport({
        origins: ["https://app.example.com"],
        timeoutMs: 50,
        url: fixture.url,
      });
      const rejected = expect(pending).rejects.toMatchObject({
        code: "media-audit-timeout",
        name: "TimeoutError",
      });
      await fixture.received.promise;
      if (bodyStarted) {
        await headersReceived.promise;
        await vi.advanceTimersByTimeAsync(0);
      }
      await vi.advanceTimersByTimeAsync(50);
      await rejected;
      await fixture.closed.promise;
      expect(globalThis.fetch.mock.calls).toHaveLength(1);
      expect(globalThis.fetch.mock.calls[0][1].signal.aborted).toBe(true);
    }
  );
});
