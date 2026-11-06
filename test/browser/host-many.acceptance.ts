import { expect, test } from "@playwright/test";
import { mediaOrigin } from "./host-helpers";

declare global {
  interface Window {
    hostHlsLoads?: number;
    hostIntersectionObservers?: number;
    hostMountEnd?: number;
    hostMountStart?: number;
  }
}

const count = 100;

test("100 idle compact players share one observer and load nothing but posters", async ({
  page,
  request,
}, testInfo) => {
  await page.addInitScript(() => {
    const Native = window.IntersectionObserver;
    window.hostIntersectionObservers = 0;
    window.IntersectionObserver = class extends Native {
      constructor(...args: ConstructorParameters<typeof Native>) {
        super(...args);
        window.hostIntersectionObservers =
          (window.hostIntersectionObservers ?? 0) + 1;
      }
    };
  });
  const mountTimes: number[] = [];
  let measured = { domNodesPerPlayer: 0, observers: 0, posters: 0 };
  for (let run = 0; run < 3; run += 1) {
    // biome-ignore lint/performance/noAwaitInLoops: Timed runs must not overlap.
    await request.get(`${mediaOrigin}/requests?clear=1`);
    const posters: string[] = [];
    page.on("request", (event) => {
      if (new URL(event.url()).pathname.startsWith("/poster/")) {
        posters.push(event.url());
      }
    });
    await page.goto(`/host.html?scenario=many&count=${count}`);
    await expect(page.locator(".vibe-player-stage")).toHaveCount(count);
    await expect
      .poll(() => page.evaluate(() => window.hostMountEnd ?? 0))
      .toBeGreaterThan(0);
    // Observe an idle interval longer than a manifest startup turn.
    await page.waitForTimeout(650);
    const metrics = await page.evaluate(() => {
      const stages = Array.from(
        document.querySelectorAll(".vibe-player-stage")
      );
      const nodes = stages.reduce(
        (total, stage) => total + stage.querySelectorAll("*").length + 1,
        0
      );
      return {
        domNodesPerPlayer: nodes / stages.length,
        hlsLoads: window.hostHlsLoads ?? 0,
        mountMs: (window.hostMountEnd ?? 0) - (window.hostMountStart ?? 0),
        observers: window.hostIntersectionObservers ?? 0,
        videos: document.querySelectorAll("video").length,
      };
    });
    expect(metrics.videos).toBe(0);
    expect(metrics.hlsLoads).toBe(0);
    expect(await (await request.get(`${mediaOrigin}/requests`)).json()).toEqual(
      []
    );
    mountTimes.push(metrics.mountMs);
    measured = {
      domNodesPerPlayer: metrics.domNodesPerPlayer,
      observers: metrics.observers,
      posters: new Set(posters).size,
    };
    page.removeAllListeners("request");
  }
  const sorted = [...mountTimes].sort((left, right) => left - right);
  const report = {
    count,
    medianMountMs: Number(sorted[1]?.toFixed(1)),
    mountMs: mountTimes.map((value) => Number(value.toFixed(1))),
    ...measured,
  };
  console.log(
    `many-players ${testInfo.project.name} ${JSON.stringify(report)}`
  );
  testInfo.annotations.push({
    description: JSON.stringify(report),
    type: "measurement",
  });
  expect(measured.observers).toBe(1);
  // Offscreen posters wait for scrolling instead of 100 eager requests.
  expect(measured.posters).toBeLessThan(count);
});
