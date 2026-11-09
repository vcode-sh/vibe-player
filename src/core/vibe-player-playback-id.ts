/** Playbacks created by this copy of the package; makes ids page-unique. */
let created = 0;

/**
 * A playback id: a random token plus a page-wide counter. The counter keeps
 * ids unique within the page; the token keeps them apart across pages and
 * bundled copies. `crypto.getRandomValues` works in insecure contexts too
 * (unlike `crypto.randomUUID`); without Web Crypto, `Math.random` stands in.
 */
export function createVibePlayerPlaybackId(): string {
  created += 1;
  return `${createRandomToken()}-${created.toString(36)}`;
}

function createRandomToken(): string {
  const bytes = new Uint8Array(8);
  // Typed as always present, but absent in some runtimes.
  const { crypto } = globalThis;
  if (typeof crypto?.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}
