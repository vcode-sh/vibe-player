import { expect, type Page, test } from "@playwright/test";
import { readMedia } from "./helpers";

interface Probe {
  events: string[];
  posters: number;
  states: string[];
}

const player = ".vibe-player-compact";

/** Records media reloads, poster insertions and chrome phases from now on. */
async function instrument(page: Page) {
  await page.evaluate((selector) => {
    const probe: Probe = { events: [], posters: 0, states: [] };
    const root = document.querySelector(selector);
    const video = root?.querySelector("video");
    if (!(root && video)) {
      throw new Error("Missing player media.");
    }
    for (const type of ["abort", "emptied", "loadstart"]) {
      video.addEventListener(type, () => probe.events.push(type));
    }
    new MutationObserver((records) => {
      for (const record of records) {
        if (record.attributeName === "data-state") {
          probe.states.push(root.getAttribute("data-state") ?? "");
        }
        for (const node of record.addedNodes) {
          if (node instanceof HTMLImageElement) {
            probe.posters += 1;
          }
        }
      }
    }).observe(root, {
      attributeFilter: ["data-state"],
      attributes: true,
      childList: true,
    });
    Object.assign(window, { vibePlayerProbe: probe });
  }, player);
}

function readProbe(page: Page): Promise<Probe> {
  return page.evaluate(
    () => (window as unknown as { vibePlayerProbe: Probe }).vibePlayerProbe
  );
}

async function expectAdvancing(page: Page) {
  const from = (await readMedia(page)).currentTime;
  await expect
    .poll(async () => (await readMedia(page)).currentTime)
    .toBeGreaterThan(from + 0.4);
  expect((await readMedia(page)).paused).toBe(false);
}

async function startPlayback(page: Page, query = "") {
  await page.goto(`/host-frame.html${query}`);
  await expect(page.locator(`${player} [data-part="poster"]`)).toBeVisible();
  await page.getByRole("button", { exact: true, name: "Play" }).click();
  await expect(page.locator(player)).toHaveAttribute("data-state", "playing");
  await expectAdvancing(page);
}

async function togglePlayback(page: Page, name: "Pause" | "Play") {
  await page.locator(player).hover();
  await page
    .locator(`${player} [data-part="controls"]`)
    .getByRole("button", { exact: true, name })
    .click();
}

function hostOf(page: Page) {
  return page
    .locator("video")
    .evaluate((video) =>
      video
        .closest("[aria-label]:is(section, aside):not(.vibe-player-compact)")
        ?.getAttribute("aria-label")
    );
}

test("resuming from a pause keeps the paused frame instead of the poster", async ({
  page,
}) => {
  await startPlayback(page);
  await togglePlayback(page, "Pause");
  await expect(page.locator(player)).toHaveAttribute("data-state", "paused");
  await instrument(page);

  await togglePlayback(page, "Play");
  await expectAdvancing(page);

  const probe = await readProbe(page);
  expect(probe.posters).toBe(0);
  expect(probe.states).not.toContain("loading");
  expect(probe.states.at(-1)).toBe("playing");
  expect(probe.events).toEqual([]);
});

for (const provider of ["file", "hls"] as const) {
  test(`${provider} playback keeps playing while it moves between hosts`, async ({
    page,
    browserName,
  }) => {
    test.skip(
      provider === "hls" && browserName === "webkit",
      "Managed HLS needs MediaSource; WebKit runs its native-HLS fixture."
    );
    await startPlayback(page, provider === "hls" ? "?provider=hls" : "");
    const video = await page.locator("video").elementHandle();
    await instrument(page);
    expect(await hostOf(page)).toBe("Inline slot");

    await page
      .getByRole("button", { exact: true, name: "Float player" })
      .click();
    expect(await hostOf(page)).toBe("Floating host");
    await expectAdvancing(page);

    await togglePlayback(page, "Pause");
    await expect.poll(async () => (await readMedia(page)).paused).toBe(true);
    const report = JSON.parse(
      (await page
        .getByRole("status", { name: "Watched ranges" })
        .textContent()) ?? "null"
    );
    expect(report).toMatchObject({
      reason: "pause",
      sourceId: `host-${provider}`,
    });
    expect(report.ranges).toHaveLength(1);
    const pausedAt = (await readMedia(page)).currentTime;

    await page
      .getByRole("button", { exact: true, name: "Dock player" })
      .click();
    expect(await hostOf(page)).toBe("Inline slot");
    expect((await readMedia(page)).currentTime).toBeCloseTo(pausedAt, 1);
    await togglePlayback(page, "Play");
    await expectAdvancing(page);

    expect(await video?.evaluate((element) => element.isConnected)).toBe(true);
    await expect(page.locator("video")).toHaveCount(1);
    expect(await page.locator("video").elementHandle()).toBeTruthy();
    expect(
      await page.evaluate(
        (element) => element === document.querySelector("video"),
        video
      )
    ).toBe(true);
    expect((await readProbe(page)).events).toEqual([]);
  });
}

test("the heatmap spans the scrubber under its fill", async ({ page }) => {
  await startPlayback(page);
  await page.locator(player).hover();
  const geometry = await page.evaluate((selector) => {
    const width = (part: string) =>
      document.querySelector(`${selector} ${part}`)?.getBoundingClientRect()
        .width ?? 0;
    return {
      heatmap: width('[data-part="heatmap"]'),
      rail: width(".vibe-player-scrubber__rail"),
    };
  }, player);
  expect(geometry.rail).toBeGreaterThan(40);
  expect(geometry.heatmap).toBeCloseTo(geometry.rail, 0);
});
