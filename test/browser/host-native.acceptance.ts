import { expect, test } from "@playwright/test";
import {
  attachHostDiagnostics,
  attachHostMediaRequests,
} from "./host-diagnostics";
import { mediaOrigin, mediaState, play, player } from "./host-helpers";

test.skip(
  ({ browserName }) => browserName !== "webkit",
  "This lane requires WebKit's real native HLS decoder."
);

test.beforeEach(async ({ request }) => {
  await request.get(`${mediaOrigin}/requests?clear=1`);
});

test.afterEach(async ({ page, request }, info) => {
  await attachHostDiagnostics(page, info);
  await attachHostMediaRequests(request, info);
});

test("native HLS waits for Play then explicitly loads and decodes", async ({
  page,
  request,
}, info) => {
  await page.goto(
    "/host.html?scenario=native&native=1&name=landscape&width=400"
  );
  const surface = player(page, "landscape");
  await expect(
    surface.getByRole("button", { exact: true, name: "Play" }).first()
  ).toBeVisible();
  await page.waitForTimeout(650);
  expect(await (await request.get(`${mediaOrigin}/requests`)).json()).toEqual(
    []
  );
  await play(surface);
  expect((await mediaState(surface)).source).toContain("/v/");
  await page.screenshot({
    fullPage: true,
    path: info.outputPath("native-hls-playing.png"),
  });
});

test("native HLS expiry renews and preserves the decoded position", async ({
  page,
  request,
}, info) => {
  await page.goto("/host.html?scenario=expiry&native=1&width=480");
  const surface = player(page, "long");
  await play(surface);
  await expect
    .poll(async () => (await mediaState(surface)).currentTime)
    .toBeGreaterThan(2);
  await expect(surface.getByRole("status", { name: "Renewals" })).toHaveText(
    "1",
    { timeout: 30_000 }
  );
  const original = Number(
    await surface
      .getByRole("status", { name: "Original media time" })
      .textContent()
  );
  expect(original).toBeGreaterThan(2);
  const start = surface.getByRole("status", { name: "Renewed media start" });
  await expect(start).not.toHaveText("pending");
  const firstResumedTime = Number(await start.textContent());
  expect(firstResumedTime).toBeGreaterThan(original - 1);
  expect(firstResumedTime).toBeLessThan(original + 3);
  await expect
    .poll(async () => (await mediaState(surface)).currentTime)
    .toBeGreaterThan(original - 1);
  const resumed = (await mediaState(surface)).currentTime;
  expect(resumed).toBeLessThan(original + 3);
  await expect
    .poll(async () => (await mediaState(surface)).currentTime)
    .toBeGreaterThan(resumed + 0.5);
  const requests: { path: string; status: number }[] = await (
    await request.get(`${mediaOrigin}/requests`)
  ).json();
  expect(requests.some((entry) => entry.status === 403)).toBe(true);
  expect(
    new Set(
      requests
        .filter(
          (entry) => entry.status === 200 && entry.path.endsWith("master.m3u8")
        )
        .map((entry) => entry.path)
    ).size
  ).toBe(2);
  expect((await mediaState(surface)).source).toContain("/v/");
  await page.screenshot({
    fullPage: true,
    path: info.outputPath("native-hls-renewed.png"),
  });
});

test("native HLS expired manifest reaches Retry and the next URL decodes", async ({
  page,
}, info) => {
  await page.goto("/host.html?scenario=error&native=1&width=236");
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
  await page.screenshot({
    fullPage: true,
    path: info.outputPath("native-hls-error-retry.png"),
  });
  await retry.click();
  await expect
    .poll(async () => (await mediaState(surface)).currentTime)
    .toBeGreaterThan(0.2);
  expect((await mediaState(surface)).source).toContain("/v/");
  await expect(surface.getByRole("status", { name: "Renewals" })).toHaveText(
    "2"
  );
});
