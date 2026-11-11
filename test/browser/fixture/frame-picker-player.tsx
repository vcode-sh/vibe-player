import { useState } from "react";
import { createRoot } from "react-dom/client";
import { VibePlayerFramePicker } from "vibe-player/compact";
import "vibe-player/styles.css";
import { seekThumbnails } from "./seek-thumbnails";
import { createSource } from "./sources";

/**
 * `?provider=file|hls` renders a 24 s frame picker 480 px wide, starting at
 * 3 s; the picked time is echoed in `output` for the test to read.
 */
const query = new URLSearchParams(window.location.search);
const source = createSource(query.get("provider") === "hls" ? "hls" : "file");

function Picker() {
  const [value, setValue] = useState(3);
  return (
    <div style={{ width: 480 }}>
      <VibePlayerFramePicker
        onChange={setValue}
        seekThumbnails={seekThumbnails}
        source={source}
        value={value}
      />
      <output>{value}</output>
    </div>
  );
}

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing frame picker fixture root.");
}
createRoot(root).render(
  <main>
    <Picker />
  </main>
);
