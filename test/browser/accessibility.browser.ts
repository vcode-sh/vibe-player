import { expect, type Page, test } from "@playwright/test";

interface AccessibleNode {
  name: string;
  properties: Record<string, string>;
  role: string;
}

async function readAccessibilityTree(page: Page): Promise<AccessibleNode[]> {
  const session = await page.context().newCDPSession(page);
  try {
    const { nodes } = await session.send("Accessibility.getFullAXTree");
    return nodes
      .filter((node) => !node.ignored)
      .map((node) => ({
        name: String(node.name?.value ?? ""),
        properties: Object.fromEntries(
          (node.properties ?? []).map((property) => [
            property.name,
            String(property.value.value),
          ])
        ),
        role: String(node.role?.value ?? ""),
      }));
  } finally {
    await session.detach();
  }
}

async function openPlayer(page: Page) {
  await page.goto("/accessibility.html");
  await page.getByRole("button", { name: "Open accessible player" }).click();
  await expect(
    page.getByRole("button", { exact: true, name: "Play" })
  ).toBeVisible();
  return page.getByRole("dialog", {
    exact: true,
    name: "Accessibility sample video player",
  });
}

test("browser accessibility tree exposes native modality and nested control semantics", async ({
  page,
}, testInfo) => {
  const dialog = await openPlayer(page);
  const initial = await readAccessibilityTree(page);
  expect(initial).toContainEqual(
    expect.objectContaining({
      name: "Accessibility sample video player",
      properties: expect.objectContaining({ modal: "true" }),
      role: "dialog",
    })
  );
  expect(initial.some((node) => node.name === "Background action")).toBe(false);

  const quality = dialog.getByRole("button", { name: "Quality Auto" });
  await quality.click();
  const qualityTree = await readAccessibilityTree(page);
  expect(qualityTree).toContainEqual(
    expect.objectContaining({ name: "Quality", role: "listbox" })
  );
  expect(qualityTree).toContainEqual(
    expect.objectContaining({
      name: "Auto Adaptive",
      properties: expect.objectContaining({ selected: "true" }),
      role: "option",
    })
  );
  await page.keyboard.press("Escape");
  await expect(dialog.getByRole("listbox")).toHaveCount(0);
  await expect(quality).toBeFocused();

  const volume = dialog.getByRole("button", { name: "Mute, volume 100%" });
  await volume.focus();
  const slider = dialog.getByRole("slider", { name: "Volume" });
  await expect(slider).toBeVisible();
  const volumeTree = await readAccessibilityTree(page);
  expect(volumeTree).toContainEqual(
    expect.objectContaining({ name: "Volume", role: "slider" })
  );
  await slider.focus();
  await page.keyboard.press("Escape");
  await expect(slider).toHaveCount(0);
  await expect(volume).toBeFocused();
  await testInfo.attach("native-modal-and-controls-ax", {
    body: JSON.stringify({ initial, qualityTree, volumeTree }, null, 2),
    contentType: "application/json",
  });
});

test("caption failure is a polite live status with a reachable successful retry", async ({
  page,
}, testInfo) => {
  const dialog = await openPlayer(page);
  const status = dialog.getByRole("status");
  await expect(status).toHaveText("Captions unavailableRetry captions");
  const errorTree = await readAccessibilityTree(page);
  expect(errorTree).toContainEqual(
    expect.objectContaining({
      properties: expect.objectContaining({ atomic: "true", live: "polite" }),
      role: "status",
    })
  );
  const retry = dialog.getByRole("button", { name: "Retry captions" });
  await retry.focus();
  await page.keyboard.press("Enter");
  await expect(status).toHaveCount(0);
  await expect(dialog.getByText("Recovered English captions")).toBeVisible();
  expect(
    await dialog.evaluate((element) => element.contains(document.activeElement))
  ).toBe(true);
  await dialog.getByRole("button", { exact: true, name: "Play" }).click();
  await expect(
    dialog.getByRole("button", { exact: true, name: "Pause" })
  ).toBeVisible();
  await testInfo.attach("caption-failure-live-status-ax", {
    body: JSON.stringify(errorTree, null, 2),
    contentType: "application/json",
  });
});

test("fullscreen exposes its exit action and restores accessible entry semantics", async ({
  page,
}) => {
  const dialog = await openPlayer(page);
  await dialog
    .getByRole("button", { exact: true, name: "Full screen" })
    .click();
  await expect(
    dialog.getByRole("button", { name: "Exit full screen" })
  ).toBeVisible();
  const fullscreenTree = await readAccessibilityTree(page);
  expect(fullscreenTree).toContainEqual(
    expect.objectContaining({ name: "Exit full screen", role: "button" })
  );
  expect(fullscreenTree.some((node) => node.name === "Full screen")).toBe(
    false
  );

  await page.evaluate(() => document.exitFullscreen());

  await expect(
    dialog.getByRole("button", { exact: true, name: "Full screen" })
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Exit full screen" })
  ).toHaveCount(0);
  await dialog.getByRole("button", { exact: true, name: "Close" }).focus();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Open accessible player" })
  ).toBeFocused();
});
