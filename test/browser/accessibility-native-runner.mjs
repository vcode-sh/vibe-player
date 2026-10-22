import { execFileSync, spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";

const [, , work] = process.argv;
if (!(work && process.env.XDG_RUNTIME_DIR === join(work, "runtime"))) {
  throw new Error(
    "Run accessibility-native.mjs; this runner requires its private session."
  );
}
const directory = dirname(fileURLToPath(import.meta.url));
const speech = spawn(
  "speech-dispatcher",
  [
    "--run-single",
    "--socket-path",
    `${work}/speech.sock`,
    "--config-dir",
    `${work}/speech`,
    "--pid-file",
    `${work}/speech.pid`,
  ],
  { stdio: "ignore" }
);
const orca = spawn("orca", ["--debug-file", `${work}/orca.log`], {
  stdio: "ignore",
});

function readSpeech() {
  try {
    return readFileSync(`${work}/orca.log`, "utf8");
  } catch {
    return "";
  }
}

async function waitForSpeech(text) {
  await expect
    .poll(
      () =>
        readSpeech()
          .split("\n")
          .some(
            (line) => line.includes("SPEECH OUTPUT") && line.includes(text)
          ),
      { timeout: 5000 }
    )
    .toBe(true);
}

function pressNativeKey(key) {
  execFileSync(
    "/usr/bin/python3",
    [join(directory, "accessibility-native-key.py"), key],
    { timeout: 2000 }
  );
}

function captureTree(name) {
  const text = execFileSync(
    "/usr/bin/python3",
    [join(directory, "accessibility-native-tree.py")],
    { encoding: "utf8", timeout: 10_000 }
  );
  writeFileSync(`${work}/${name}.json`, text);
  return JSON.parse(text);
}

async function verifyCaptionRetry(page, dialog) {
  await waitForSpeech("Captions unavailable");
  const retry = dialog.getByRole("button", { name: "Retry captions" });
  await retry.focus();
  await waitForSpeech("Retry captions");
  pressNativeKey("Return");
  await expect(dialog.getByText("Recovered English captions")).toBeVisible();
  expect(
    await dialog.evaluate((node) => node.contains(document.activeElement))
  ).toBe(true);
  expect(await page.locator("video").count()).toBe(1);
}

async function verifyFullscreen(page, dialog) {
  await dialog
    .getByRole("button", { exact: true, name: "Full screen" })
    .focus();
  await waitForSpeech("Full screen");
  pressNativeKey("Return");
  await expect
    .poll(() => page.evaluate(() => Boolean(document.fullscreenElement)))
    .toBe(true);
  await expect(
    dialog.getByRole("button", { name: "Exit full screen" })
  ).toBeVisible();
  await waitForSpeech("Exit full screen");
  pressNativeKey("Escape");
  await expect
    .poll(() => page.evaluate(() => Boolean(document.fullscreenElement)))
    .toBe(false);
  await expect(dialog).toBeVisible();
  console.log("OS-synthetic Escape exits fullscreen and keeps its modal open.");
}

async function verifyPopovers(page, dialog) {
  const quality = dialog.getByRole("button", { name: "Quality Auto" });
  await quality.focus();
  await waitForSpeech("Quality Auto");
  pressNativeKey("Return");
  await expect(dialog.getByRole("listbox", { name: "Quality" })).toBeVisible();
  await waitForSpeech("opens listbox");
  const qualityTree = captureTree("quality-atspi");
  expect(qualityTree).toContainEqual(
    expect.objectContaining({ name: "Quality", role: "list box" })
  );
  pressNativeKey("Escape");
  await expect(dialog.getByRole("listbox")).toHaveCount(0);
  await expect(quality).toBeFocused();
  const volume = dialog.getByRole("button", { name: "Mute, volume 100%" });
  await volume.focus();
  await waitForSpeech("Mute, volume 100%");
  const slider = dialog.getByRole("slider", { name: "Volume" });
  await slider.focus();
  const volumeTree = captureTree("volume-atspi");
  await waitForSpeech("vertical slider");
  expect(volumeTree).toContainEqual(
    expect.objectContaining({ name: "Volume", role: "slider" })
  );
  pressNativeKey("Escape");
  await expect(slider).toHaveCount(0);
  await expect(volume).toBeFocused();
  await expect(dialog).toBeVisible();
  pressNativeKey("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Open accessible player" })
  ).toBeFocused();
  const closedTree = captureTree("closed-atspi");
  expect(closedTree).toContainEqual(
    expect.objectContaining({
      focused: true,
      name: "Open accessible player",
      role: "button",
    })
  );
  console.log("OS-synthetic popover/modal Escape restores the opener.");
}

let browser;
try {
  browser = await chromium.launch({
    args: ["--force-renderer-accessibility", "--ozone-platform=x11"],
    channel: "chrome",
    headless: false,
  });
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:5197/accessibility.html");
  await page.bringToFront();
  await expect
    .poll(() => readSpeech().includes("Starting Atspi main event loop"), {
      timeout: 10_000,
    })
    .toBe(true);
  await page.getByRole("button", { name: "Open accessible player" }).focus();
  pressNativeKey("Return");
  const dialog = page.getByRole("dialog", {
    exact: true,
    name: "Accessibility sample video player",
  });
  await expect(
    dialog.getByRole("button", { name: "Retry captions" })
  ).toBeVisible();
  const initial = captureTree("modal-atspi");
  expect(initial).toContainEqual(
    expect.objectContaining({
      modal: true,
      name: "Accessibility sample video player",
      role: "dialog",
    })
  );
  expect(initial.some((node) => node.name === "Background action")).toBe(false);
  await verifyCaptionRetry(page, dialog);
  await verifyFullscreen(page, dialog);
  await verifyPopovers(page, dialog);
  const utterances = readSpeech()
    .split("\n")
    .filter((line) => line.includes("SPEECH OUTPUT"));
  writeFileSync(`${work}/orca-utterances.txt`, utterances.join("\n"));
  console.log(
    `Native AT-SPI and Orca generated-speech checks passed with ${browser.version()}.`
  );
} finally {
  try {
    await browser?.close();
  } finally {
    orca.kill("SIGKILL");
    speech.kill("SIGKILL");
  }
}
