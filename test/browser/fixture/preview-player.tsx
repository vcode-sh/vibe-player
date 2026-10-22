import { useState } from "react";
import { createRoot } from "react-dom/client";
import { VibePlayerAmbientPreview } from "vibe-player";
import "vibe-player/styles.css";
import "./styles.css";

const source = {
  id: "local-preview",
  posterUrl:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='360'%3E%3Crect width='640' height='360' fill='%23253040'/%3E%3C/svg%3E",
  previewVideoUrl: "/media/file.mp4",
};

function PreviewFixture() {
  const [paused, setPaused] = useState(false);
  const [mounted, setMounted] = useState(true);
  return (
    <main>
      <h1>Ambient preview lifecycle</h1>
      <nav aria-label="Preview fixture actions">
        <button
          aria-pressed={paused}
          onClick={() => setPaused((current) => !current)}
          type="button"
        >
          {paused ? "Resume preview" : "Pause preview"}
        </button>
        <button
          disabled={!mounted}
          onClick={() => setMounted(false)}
          type="button"
        >
          Unmount preview
        </button>
      </nav>
      <section aria-label="Preview fixture" style={{ maxWidth: 640 }}>
        {mounted ? (
          <VibePlayerAmbientPreview paused={paused} source={source} />
        ) : null}
      </section>
    </main>
  );
}

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing preview fixture root.");
}
createRoot(root).render(<PreviewFixture />);
