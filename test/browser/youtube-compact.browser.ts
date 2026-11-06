import { expect, test } from "@playwright/test";

test("compact chrome remains outside the provider's media rectangle", async ({
  page,
}, testInfo) => {
  await page.goto("/youtube-layout.html?variant=compact&width=640");
  const frame = page.locator("iframe");
  await expect(frame).toHaveCount(1);
  const controls = page.locator('[data-part="controls"]');
  await expect(
    controls.getByRole("button", { exact: true, name: "Play" })
  ).toBeVisible();
  const mediaBox = await frame.boundingBox();
  const controlsBox = await controls.boundingBox();
  if (!(mediaBox && controlsBox)) {
    throw new Error("Missing compact provider geometry.");
  }
  expect(controlsBox.y).toBeGreaterThanOrEqual(mediaBox.y + mediaBox.height);
  await controls.getByRole("button", { exact: true, name: "Play" }).click();
  await expect(
    controls.getByRole("button", { exact: true, name: "Pause" })
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("compact-youtube-outside.png"),
  });
});
