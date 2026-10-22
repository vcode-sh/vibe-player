import { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  createHlsAdapter,
  type HlsAdapterRuntime,
  type VibePlayerControllerState,
  VibePlayerModal,
  VibePlayerStage,
} from "vibe-player";
import "vibe-player/styles.css";
import { createSource } from "./sources";
import "./styles.css";

// Select the public native fallback without changing browser media APIs.
const nativeRuntime: HlsAdapterRuntime = {
  attachManagedHls() {
    throw new Error("Native HLS acceptance must not attach a managed runtime.");
  },
  canUseManagedHls: () => false,
};
const adapterFactory = () => createHlsAdapter(nativeRuntime);
const source = createSource("hls");

function App() {
  const [modal, setModal] = useState(false);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<VibePlayerControllerState | null>(null);
  const playback = {
    adapterFactory,
    autoHideControls: false,
    onStateChange: setState,
    source,
  };
  return (
    <main>
      <h1>Native HLS acceptance</h1>
      <button
        onClick={() => {
          setModal(true);
          setOpen(true);
        }}
        type="button"
      >
        Open native modal
      </button>
      <button onClick={() => setModal(false)} type="button">
        Use native stage
      </button>
      <output aria-label="Native player status">
        {state?.snapshot.readyState ?? "idle"}
      </output>
      {modal ? (
        <VibePlayerModal
          {...playback}
          onClose={() => setOpen(false)}
          open={open}
        />
      ) : (
        <VibePlayerStage {...playback} />
      )}
    </main>
  );
}

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing native HLS fixture root.");
}
createRoot(root).render(<App />);
