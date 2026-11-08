import { useEffect, useState } from "react";

const probeUrl = "/adoption-media/landscape/master.m3u8";

/**
 * The local clips are generated, not committed. Vite answers a missing file
 * with the HTML shell, so the probe checks for a real playlist.
 */
function useGeneratedMediaReady(): boolean | null {
  const [ready, setReady] = useState<boolean | null>(null);
  useEffect(() => {
    const abort = new AbortController();
    fetch(probeUrl, { signal: abort.signal })
      .then(async (response) => {
        const text = response.ok ? await response.text() : "";
        setReady(text.startsWith("#EXTM3U"));
      })
      .catch(() => {
        if (!abort.signal.aborted) {
          setReady(false);
        }
      });
    return () => abort.abort();
  }, []);
  return ready;
}

/** Explains the one setup step when the generated media is missing. */
export function MediaCheck() {
  const ready = useGeneratedMediaReady();
  if (ready !== false) {
    return null;
  }
  return (
    <div className="sc-notice" role="status">
      <strong>Local demo media is missing.</strong>
      <span>
        Run <code>bun run test:browser:host:media</code> (FFmpeg with libx264)
        once after cloning, then reload. The provider workbench still plays its
        remote sources.
      </span>
    </div>
  );
}
