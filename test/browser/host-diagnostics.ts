import { writeFile } from "node:fs/promises";
import type { APIRequestContext, Page, TestInfo } from "@playwright/test";
import { mediaOrigin } from "./host-helpers";

export async function attachHostDiagnostics(page: Page, info: TestInfo) {
  const diagnostics = await page
    .locator("[data-engine-diagnostics]")
    .allTextContents();
  const path = info.outputPath("engine-diagnostics.json");
  await writeFile(path, diagnostics.join("\n"));
  await info.attach("engine-diagnostics", {
    contentType: "application/json",
    path,
  });
}

export async function attachHostMediaRequests(
  request: APIRequestContext,
  info: TestInfo
) {
  const body = await (await request.get(`${mediaOrigin}/requests`)).text();
  const path = info.outputPath("media-requests.json");
  await writeFile(path, body);
  await info.attach("media-requests", {
    contentType: "application/json",
    path,
  });
}
