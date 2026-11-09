import { describe, expect, it } from "vitest";
import { readNpmVersionState } from "./npm-version-check.mjs";

function respondWith(status) {
  const requests = [];
  const fetchVersion = (url) => {
    requests.push(url);
    return Promise.resolve(new Response("{}", { status }));
  };
  return { fetchVersion, requests };
}

describe("readNpmVersionState", () => {
  it("asks for the exact version and reports a published one", async () => {
    const { fetchVersion, requests } = respondWith(200);

    expect(
      await readNpmVersionState("vibe-player", "0.8.0-alpha.1", fetchVersion)
    ).toEqual({ state: "published" });
    expect(requests).toEqual([
      "https://registry.npmjs.org/vibe-player/0.8.0-alpha.1",
    ]);
  });

  it("treats only 404 as unpublished", async () => {
    const { fetchVersion } = respondWith(404);

    expect(
      await readNpmVersionState("vibe-player", "0.8.0", fetchVersion)
    ).toEqual({ state: "unpublished" });
  });

  it.each([500, 503, 401, 302])(
    "reports HTTP %i as an error rather than unpublished",
    async (status) => {
      const { fetchVersion } = respondWith(status);

      expect(
        await readNpmVersionState("vibe-player", "0.8.0", fetchVersion)
      ).toEqual({ detail: `HTTP ${status}`, state: "error" });
    }
  );

  it("reports a network failure as an error", async () => {
    const fetchVersion = () => Promise.reject(new TypeError("fetch failed"));

    expect(
      await readNpmVersionState("vibe-player", "0.8.0", fetchVersion)
    ).toEqual({ detail: "fetch failed", state: "error" });
  });
});
