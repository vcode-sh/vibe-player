import { useEffect } from "react";
import { VibePlayerStage } from "vibe-player";

const mediaOrigin = "http://127.0.0.1:5222";
const loadHls = () => {
  window.hostHlsLoads = (window.hostHlsLoads ?? 0) + 1;
  return import("hls.js/light");
};

declare global {
  interface Window {
    hostHlsLoads?: number;
    hostMountEnd?: number;
    hostMountStart?: number;
  }
}

/** A chat history: many idle compact players, each with its own poster. */
export function ManyPlayers({ count }: { count: number }) {
  useEffect(() => {
    // Parent effects run after every child effect has committed.
    window.hostMountEnd = performance.now();
  }, []);
  return (
    <div className="host-history">
      {Array.from({ length: count }, (_, index) => {
        const portrait = index % 2 === 0;
        return (
          <div
            className="host-frame"
            // biome-ignore lint/suspicious/noArrayIndexKey: The list is static.
            key={index}
            style={{ width: 236 }}
          >
            <VibePlayerStage
              load="onPlay"
              loadHls={loadHls}
              source={{
                durationSeconds: 8,
                height: portrait ? 1280 : 720,
                id: `history-${index}`,
                posterUrl: `${mediaOrigin}/poster/${portrait ? "portrait" : "landscape"}.jpg?index=${index}`,
                type: "hls",
                url: `${mediaOrigin}/v/${Date.now() + 600_000}/${portrait ? "portrait" : "landscape"}/master.m3u8`,
                width: portrait ? 720 : 1280,
              }}
              variant="compact"
            />
          </div>
        );
      })}
    </div>
  );
}
