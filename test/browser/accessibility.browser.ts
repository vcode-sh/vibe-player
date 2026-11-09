import { expect, type Page, test } from "@playwright/test";

const seekAnnouncement = /^0:2\d of 0:24$/;

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
  // The player's announcer is a second, separate status region.
  const status = dialog.locator(".vibe-player-stage__caption-status");
  await expect(status).toHaveRole("status");
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

test("fullscreen toggle keeps its name and exposes its pressed state", async ({
  page,
}) => {
  const dialog = await openPlayer(page);
  const toggle = dialog.getByRole("button", {
    exact: true,
    name: "Full screen",
  });
  await toggle.click();
  await expect
    .poll(() => page.evaluate(() => Boolean(document.fullscreenElement)))
    .toBe(true);
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  const fullscreenTree = await readAccessibilityTree(page);
  expect(fullscreenTree).toContainEqual(
    expect.objectContaining({
      name: "Full screen",
      properties: expect.objectContaining({ pressed: "true" }),
      role: "button",
    })
  );
  expect(fullscreenTree.some((node) => node.name === "Exit full screen")).toBe(
    false
  );

  await page.evaluate(() => document.exitFullscreen());

  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await dialog.getByRole("button", { exact: true, name: "Close" }).focus();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Open accessible player" })
  ).toBeFocused();
});

async function openLivePlayers(page: Page) {
  await page.goto("/accessibility-live.html");
  const stage = page.getByRole("region", { name: "Stage sample video player" });
  const compact = page.getByRole("region", {
    name: "Compact sample video player",
  });
  // The Stage takes its media's aspect ratio; wait so later clicks land.
  await expect
    .poll(() =>
      stage
        .locator("video")
        .evaluate((video: HTMLVideoElement) => video.readyState)
    )
    .toBeGreaterThanOrEqual(1);
  return { compact, stage };
}

test("keyboard results are spoken through the player's one polite live region", async ({
  page,
}) => {
  const { stage } = await openLivePlayers(page);
  const announcer = stage.locator('[data-part="announcer"]');
  await expect(announcer).toHaveText("");
  await expect(
    stage.locator('[aria-live], [role="status"], output')
  ).toHaveCount(1);
  await page.getByRole("button", { name: "Before players" }).focus();
  await page.keyboard.press("Tab");
  await expect(stage).toBeFocused();

  await page.keyboard.press("k");
  await expect(announcer).toHaveText("Playing");
  await page.keyboard.press("k");
  await expect(announcer).toHaveText("Paused");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(announcer).toHaveText(seekAnnouncement);
  const tree = await readAccessibilityTree(page);
  expect(tree).toContainEqual(
    expect.objectContaining({
      properties: expect.objectContaining({ atomic: "true", live: "polite" }),
      role: "status",
    })
  );
});

test("a failure is announced once and then read only from the visible panel", async ({
  page,
}) => {
  await openLivePlayers(page);
  const broken = page.getByRole("region", {
    name: "Broken sample video player",
  });
  const announcer = broken.locator('[data-part="announcer"]');
  await expect(announcer).toHaveText("");
  // Scroll first: offscreen players stop, and a click that scrolls would race it.
  await broken.scrollIntoViewIfNeeded();
  await expect(broken).toBeInViewport();
  await broken.getByRole("button", { exact: true, name: "Play" }).click();
  await expect(broken).toHaveAttribute("data-state", "error");
  await expect(announcer).toHaveText("Playback unavailable");
  await expect(announcer).toHaveText("", { timeout: 8000 });
  const tree = await readAccessibilityTree(page);
  const spoken = tree.filter(
    (node) =>
      node.name === "Playback unavailable" && node.role !== "InlineTextBox"
  );
  expect(spoken).toHaveLength(1);
});

for (const name of ["Stage", "Compact"] as const) {
  test(`${name} chrome hidden during playback is revealed when focus enters the player`, async ({
    page,
  }) => {
    const players = await openLivePlayers(page);
    const player = name === "Stage" ? players.stage : players.compact;
    const before = page.getByRole("button", { name: "Before players" });
    await player.getByRole("button", { exact: true, name: "Play" }).click();
    const pause = player.getByRole("button", { name: "Pause" });
    await expect(pause).toBeVisible();
    // The pointer stays still: the idle timer hides the chrome, which is
    // then aria-hidden and inert, so assistive technology cannot reach it.
    await expect(pause).toHaveCount(0);
    await expect(player.locator("[inert]")).not.toHaveCount(0);

    // Programmatic focus, as assistive technology moves it: no key events.
    await before.focus();
    await player.focus();
    await expect(pause).toBeVisible();
  });
}
