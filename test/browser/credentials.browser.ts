import { expect, test } from "@playwright/test";
import { readMedia, startPlayback, waitForMedia } from "./helpers";

interface FixtureRequest {
  authorized: boolean;
  path: string;
}

test("credentialed HLS sends its session to cross-origin playlists and segments", async ({
  context,
  page,
}) => {
  await context.addCookies([
    {
      domain: "127.0.0.1",
      name: "fixture-session",
      path: "/media/",
      sameSite: "Lax",
      value: "allowed",
    },
  ]);
  await page.goto("/?credentials=1");
  await expect(
    page.getByRole("button", { exact: true, name: "Quality Auto" })
  ).toBeVisible();
  await waitForMedia(page);
  await startPlayback(page);
  const response = await page.request.get("http://127.0.0.1:5198/requests");
  const requests: FixtureRequest[] = await response.json();

  expect(requests.some((request) => request.path.endsWith("master.m3u8"))).toBe(
    true
  );
  expect(requests.some((request) => request.path.endsWith(".mpegts"))).toBe(
    true
  );
  expect(requests.every((request) => request.authorized)).toBe(true);
  expect((await readMedia(page)).paused).toBe(false);
});
