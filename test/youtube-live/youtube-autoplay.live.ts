import { expect, readProbe, test } from "./live-fixture";

// A real Chromium policy denies audible playback before document user activation.
// Trace snapshots grant activation in this Chromium path and invalidate that precondition.
test.use({
  launchOptions: {
    args: ["--autoplay-policy=document-user-activation-required"],
  },
  trace: "off",
});

test("official SDK reports blocked audible autoplay before user activation", async ({
  page,
}) => {
  await page.goto("/?autoplay");
  await expect.poll(async () => (await readProbe(page)).load).toBe("ready");
  await expect
    .poll(async () => (await readProbe(page)).state.playbackBlocked)
    .toBe(true);
  expect((await readProbe(page)).autoplayUserActivation).toBe(false);
  expect((await readProbe(page)).events).toContain("playblocked");
  expect((await readProbe(page)).state.error).toBeNull();
  expect((await readProbe(page)).commandError).toBeNull();
  await page.getByRole("button", { name: "Dispose" }).click();
  await expect(page.locator("iframe")).toHaveCount(0);
});
