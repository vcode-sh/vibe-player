import { expect, type Locator, type Page, test } from "@playwright/test";
import { readMedia, waitForMedia } from "./helpers";

test("dragging seek across its tooltip and player text does not select chrome", async ({
  page,
}) => {
  await page.setViewportSize({ height: 1200, width: 1100 });
  await page.goto("/selection.html");
  await waitForMedia(page);
  const seek = page.getByRole("slider", { exact: true, name: "Seek" });
  const box = await bounds(seek);
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2);
  const tooltip = page.getByText("Seek", { exact: true });
  await expect(tooltip).toBeVisible();
  const bubble = await bounds(tooltip);
  const title = await bounds(page.locator(".vibe-player-controls__title"));

  await page.mouse.down();
  await page.mouse.move(bubble.x + bubble.width, bubble.y, { steps: 5 });
  expect(await selectedText(page)).toBe("");
  await page.mouse.move(title.x + title.width, title.y, { steps: 5 });
  expect(await selectedText(page)).toBe("");
  await page.mouse.move(box.x + box.width * 0.75, box.y + box.height / 2, {
    steps: 10,
  });
  await page.mouse.up();

  expect(await selectedText(page)).toBe("");
  await expect
    .poll(async () => (await readMedia(page)).currentTime)
    .toBeGreaterThan(16);
  expect((await readMedia(page)).currentTime).toBeLessThan(20);
  await seek.focus();
  const before = (await readMedia(page)).currentTime;
  await seek.press("ArrowLeft");
  await expect
    .poll(async () => (await readMedia(page)).currentTime)
    .toBeLessThan(before);
});

test("player time, rate and seek labels stay outside browser text selection", async ({
  page,
}) => {
  await page.setViewportSize({ height: 1200, width: 1100 });
  await page.goto("/selection.html");
  await waitForMedia(page);

  expect(await selectContent(page.getByText("-00:24", { exact: true }))).toBe(
    ""
  );
  expect(
    await selectContent(
      page.getByRole("button", { exact: true, name: "Playback speed 1x" })
    )
  ).toBe("");
  await page.getByRole("slider", { exact: true, name: "Seek" }).focus();
  const tooltip = page.getByText("Seek", { exact: true });
  await expect(tooltip).toBeVisible();
  expect(await selectContent(tooltip)).toBe("");
});

test("meaningful player and host content retain text selection and editing", async ({
  page,
}) => {
  await page.setViewportSize({ height: 1200, width: 1100 });
  await page.goto("/selection.html");
  await waitForMedia(page);
  const caption = page.getByText("Local caption proof", { exact: true });
  await expect(caption).toBeVisible();

  expect(await selectContent(caption)).toBe("Local caption proof");
  expect(
    await selectContent(page.locator(".vibe-player-controls__title"))
  ).toBe("Selection fixture title");
  await dragAcrossText(page, page.getByRole("heading", { level: 1 }));
  expect(await selectedText(page)).toBe("Host selection content");
  await dragAcrossText(page, page.getByText("Host header information"));
  expect(await selectedText(page)).toBe("Host header information");
  await dragAcrossText(page, page.getByText("Host footer information"));
  expect(await selectedText(page)).toBe("Host footer information");
  const editor = page.getByRole("textbox", { name: "Host editor" });
  await dragAcrossText(page, editor);
  expect(await selectedText(page)).toContain("host");
  await editor.fill("Updated host content");
  await expect(editor).toHaveText("Updated host content");
  const note = page.getByRole("textbox", { name: "Host note" });
  await note.fill("Updated host note");
  await expect(note).toHaveValue("Updated host note");
});

async function bounds(element: Locator) {
  const box = await element.boundingBox();
  if (!box) {
    throw new Error("Missing selection target geometry.");
  }
  return box;
}

async function selectedText(page: Page) {
  return await page.evaluate(() => window.getSelection()?.toString() ?? "");
}

async function selectContent(element: Locator) {
  return await element.evaluate((node) => {
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.selectAllChildren(node);
    return selection?.toString() ?? "";
  });
}

async function dragAcrossText(page: Page, element: Locator) {
  await page.evaluate(() => window.getSelection()?.removeAllRanges());
  const rect = await element.evaluate((node) => {
    const range = document.createRange();
    range.selectNodeContents(node);
    const box = range.getBoundingClientRect();
    return { height: box.height, width: box.width, x: box.x, y: box.y };
  });
  await page.mouse.move(rect.x + 1, rect.y + rect.height / 2);
  await page.mouse.down();
  await page.mouse.move(rect.x + rect.width - 1, rect.y + rect.height / 2, {
    steps: 10,
  });
  await page.mouse.up();
}
