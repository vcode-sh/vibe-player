import { expect, test } from "@playwright/test";
import {
  attachHostDiagnostics,
  attachHostMediaRequests,
} from "./host-diagnostics";
import { mediaOrigin, mediaState, play, player } from "./host-helpers";

const anyTime = /\d:\d\d/;

test.afterEach(async ({ page, request }, info) => {
  await attachHostDiagnostics(page, info);
  await attachHostMediaRequests(request, info);
});

test("the ended frame keeps Replay and restarts from the beginning", async ({
  page,
}, testInfo) => {
  await page.goto("/host.html?scenario=replay&name=landscape&width=400");
  const surface = player(page, "landscape");
  await play(surface);
  await expect
    .poll(async () => (await mediaState(surface)).ended, { timeout: 15_000 })
    .toBe(true);
  await expect(
    surface.getByRole("button", { exact: true, name: "Replay" }).first()
  ).toBeVisible();
  await page.waitForTimeout(2700);
  await expect(
    surface.getByRole("button", { exact: true, name: "Replay" }).first()
  ).toBeVisible();
  await page.screenshot({
    fullPage: true,
    path: testInfo.outputPath("ended-replay-affordance.png"),
  });
  await surface
    .getByRole("button", { exact: true, name: "Replay" })
    .first()
    .click();
  await expect.poll(async () => (await mediaState(surface)).paused).toBe(false);
  await expect
    .poll(async () => (await mediaState(surface)).currentTime)
    .toBeGreaterThan(0.2);
  expect((await mediaState(surface)).currentTime).toBeLessThan(3);
});

test("a token expires during real playback and renewal resumes its position", async ({
  page,
  request,
}, testInfo) => {
  await request.get(`${mediaOrigin}/requests?clear=1`);
  await page.goto("/host.html?scenario=expiry&width=480");
  const surface = player(page, "long");
  await play(surface);
  await expect
    .poll(async () => (await mediaState(surface)).currentTime)
    .toBeGreaterThan(2);
  await expect(surface.getByRole("status", { name: "Renewals" })).toHaveText(
    "1",
    { timeout: 30_000 }
  );
  const originalTime = Number(
    await surface
      .getByRole("status", { name: "Original media time" })
      .textContent()
  );
  expect(originalTime).toBeGreaterThan(2);
  const start = surface.getByRole("status", { name: "Renewed media start" });
  await expect(start).not.toHaveText("pending");
  const firstResumedTime = Number(await start.textContent());
  expect(firstResumedTime).toBeGreaterThan(originalTime - 1);
  expect(firstResumedTime).toBeLessThan(originalTime + 3);
  await expect
    .poll(async () => (await mediaState(surface)).currentTime)
    .toBeGreaterThan(originalTime - 1);
  const renewedAt = (await mediaState(surface)).currentTime;
  expect(renewedAt).toBeLessThan(originalTime + 3);
  await expect
    .poll(async () => (await mediaState(surface)).currentTime, {
      timeout: 12_000,
    })
    .toBeGreaterThan(renewedAt + 0.5);
  const requests: { path: string; status: number }[] = await (
    await request.get(`${mediaOrigin}/requests`)
  ).json();
  expect(requests.some((entry) => entry.status === 403)).toBe(true);
  const manifests = requests.filter(
    (entry) => entry.path.endsWith("master.m3u8") && entry.status === 200
  );
  expect(new Set(manifests.map((entry) => entry.path)).size).toBe(2);
  await expect(surface.getByRole("status", { name: "Errors" })).toHaveText("0");
  await page.screenshot({
    fullPage: true,
    path: testInfo.outputPath("renewed-during-playback.png"),
  });
});

test("failed renewal shows Retry and a new attempt actually decodes", async ({
  page,
}, testInfo) => {
  await page.goto("/host.html?scenario=error&width=236");
  const surface = player(page);
  await surface
    .getByRole("button", { exact: true, name: "Play" })
    .first()
    .click();
  const retry = surface
    .getByRole("button", { exact: true, name: "Retry" })
    .first();
  await expect(retry).toBeVisible({ timeout: 20_000 });
  await expect(surface.getByRole("status", { name: "Renewals" })).toHaveText(
    "1"
  );
  // One primary action: no idle Play, no playback button, no time badge.
  const frame = surface.locator(".host-frame");
  await expect(frame.getByRole("button")).toHaveCount(1);
  // Hidden parts stay mounted for their exit motion; only rendered text counts.
  await expect
    // biome-ignore lint/performance/useDomNodeTextContent: innerText omits hidden parts by design.
    .poll(() => frame.evaluate((node: HTMLElement) => node.innerText))
    .not.toMatch(anyTime);
  await page.screenshot({
    fullPage: true,
    path: testInfo.outputPath("failed-with-retry.png"),
  });
  await retry.click();
  await expect
    .poll(async () => (await mediaState(surface)).currentTime, {
      timeout: 15_000,
    })
    .toBeGreaterThan(0.2);
  await expect(surface.getByRole("status", { name: "Renewals" })).toHaveText(
    "2"
  );
  await expect(retry).toHaveCount(0);
});

test("an expired poster grant renews once and shows the renewed poster without media", async ({
  page,
  request,
}) => {
  await request.get(`${mediaOrigin}/requests?clear=1`);
  await page.goto("/host.html?scenario=poster&width=236");
  const surface = player(page);
  await expect(surface.getByRole("status", { name: "Renewals" })).toHaveText(
    "1"
  );
  await expect
    .poll(() =>
      surface
        .locator(".vibe-player-stage__poster")
        .evaluate((image: HTMLImageElement) => image.naturalWidth)
    )
    .toBeGreaterThan(0);
  await page.waitForTimeout(650);
  await expect(surface.getByRole("status", { name: "Renewals" })).toHaveText(
    "1"
  );
  const requests: { path: string; status: number }[] = await (
    await request.get(`${mediaOrigin}/requests`)
  ).json();
  expect(requests.map((entry) => entry.status)).toEqual([403, 200]);
  expect(requests.every((entry) => entry.path.endsWith("poster.jpg"))).toBe(
    true
  );
  await expect(
    surface.getByRole("button", { exact: true, name: "Play" })
  ).toBeVisible();
});

test("an offscreen stop keeps the poster and Play resumes from the stored position", async ({
  page,
}) => {
  await page.goto("/host.html?scenario=offscreen&name=landscape&width=400");
  const surface = player(page, "landscape");
  await play(surface);
  await expect
    .poll(async () => (await mediaState(surface)).currentTime)
    .toBeGreaterThan(2);
  const stored = (await mediaState(surface)).currentTime;
  await page.getByRole("note", { name: "Later messages" }).evaluate((note) => {
    note.scrollIntoView({ block: "end" });
  });
  await expect(
    surface.getByRole("status", { name: "Player state" })
  ).toHaveText("idle");
  await expect(surface.locator("video")).toHaveCount(0);
  await surface.scrollIntoViewIfNeeded();
  await expect(surface.locator(".vibe-player-stage__poster")).toBeVisible();
  await surface.getByRole("button", { exact: true, name: "Play" }).click();
  await expect.poll(async () => (await mediaState(surface)).paused).toBe(false);
  const resumed = (await mediaState(surface)).currentTime;
  expect(resumed).toBeGreaterThan(stored - 0.5);
  expect(resumed).toBeLessThan(stored + 3);
});
