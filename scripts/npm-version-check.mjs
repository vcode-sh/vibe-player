const REGISTRY = "https://registry.npmjs.org";
const NOT_FOUND = 404;
const OK = 200;

/**
 * Asks the npm registry whether one exact version of a package exists.
 * A 404 means it is unpublished; anything other than 200 or 404, or a
 * network failure, is an error, never a guess.
 * @param {string} name Unscoped package name.
 * @param {string} version Exact version.
 * @param {typeof fetch} fetchVersion Fetch implementation (injectable for tests).
 * @returns {Promise<{state: "published" | "unpublished"} | {state: "error", detail: string}>}
 */
export async function readNpmVersionState(name, version, fetchVersion = fetch) {
  const url = `${REGISTRY}/${encodeURIComponent(name)}/${encodeURIComponent(version)}`;
  try {
    const response = await fetchVersion(url, {
      headers: { accept: "application/json" },
    });
    await response.body?.cancel();
    if (response.status === OK) {
      return { state: "published" };
    }
    if (response.status === NOT_FOUND) {
      return { state: "unpublished" };
    }
    return { detail: `HTTP ${response.status}`, state: "error" };
  } catch (error) {
    return {
      detail: error instanceof Error ? error.message : String(error),
      state: "error",
    };
  }
}
