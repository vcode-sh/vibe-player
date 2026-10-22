import { useCallback, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  createIdleCapabilities,
  type VibePlayerFileSource,
  VibePlayerModal,
  VibePlayerQualityControl,
} from "vibe-player";
import "vibe-player/styles.css";
import "./styles.css";

const source: VibePlayerFileSource = {
  captions: [
    {
      default: true,
      id: "en",
      kind: "captions",
      label: "English",
      language: "en",
      url: "/media/captions.vtt",
    },
  ],
  id: "accessibility-sample",
  sources: [{ mimeType: "video/mp4", url: "/media/file.mp4" }],
  title: "Accessibility sample",
  type: "file",
};

function AccessibilityPlayer() {
  const [open, setOpen] = useState(false);
  const [qualityId, setQualityId] = useState("auto");
  const captionAttempts = useRef(0);
  const loadCaptionText = useCallback(() => {
    captionAttempts.current += 1;
    if (captionAttempts.current === 1) {
      return Promise.reject(new Error("Fixture caption request failed"));
    }
    return Promise.resolve(
      "WEBVTT\n\n00:00:00.000 --> 00:00:12.000\nRecovered English captions"
    );
  }, []);

  return (
    <main>
      <h1>Accessibility acceptance</h1>
      <p>
        This local fixture keeps package controls visible, exposes caption
        failure and retry, and includes a standalone quality control.
      </p>
      <button
        onClick={() => {
          captionAttempts.current = 0;
          setOpen(true);
        }}
        type="button"
      >
        Open accessible player
      </button>
      <button type="button">Background action</button>
      <VibePlayerModal
        autoHideControls={false}
        loadCaptionText={loadCaptionText}
        onClose={() => setOpen(false)}
        open={open}
        source={source}
        topActions={
          <VibePlayerQualityControl
            capabilities={{
              ...createIdleCapabilities(),
              supportsQualitySelection: true,
            }}
            onSetQuality={setQualityId}
            qualityOptions={[
              {
                auto: true,
                id: "auto",
                label: "Auto",
                selected: qualityId === "auto",
              },
              {
                auto: false,
                height: 720,
                id: "720",
                label: "720p",
                selected: qualityId === "720",
              },
            ]}
          />
        }
      />
    </main>
  );
}

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing accessibility fixture root.");
}
createRoot(root).render(<AccessibilityPlayer />);
