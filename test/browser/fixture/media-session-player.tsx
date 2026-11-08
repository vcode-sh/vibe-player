import { useState } from "react";
import { createRoot } from "react-dom/client";
import { VibePlayerInline, type VibePlayerSource } from "vibe-player";
import "vibe-player/styles.css";
import "./styles.css";

const sources: VibePlayerSource[] = [
  {
    id: "session-file",
    posterUrl: "/media/seek-frame.jpg",
    sources: [{ mimeType: "video/mp4", url: "/media/file.mp4" }],
    title: "Fjord file",
    type: "file",
  },
  {
    id: "session-hls",
    manifestUrl: "/media/master.m3u8",
    title: "Fjord HLS",
    type: "hls",
  },
];

/** Two audible-capable players; the app supplies metadata and next track. */
function App() {
  const [next, setNext] = useState("none");
  return (
    <main>
      <output aria-label="Next track request">{next}</output>
      {sources.map((source) => (
        <section aria-label={source.title} key={source.id}>
          <VibePlayerInline
            autoHideControls={false}
            mediaSession={{
              metadata: { album: "Fixtures", artist: "Vibe Player" },
              onNextTrack: () => setNext(source.id),
            }}
            source={source}
            stopWhenOffscreen={false}
          />
        </section>
      ))}
    </main>
  );
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<App />);
}
