import { createRoot } from "react-dom/client";
import { VibePlayerInline } from "vibe-player";
import "vibe-player/styles.css";
import { createSource } from "./sources";
import "./styles.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing selection fixture root.");
}
createRoot(root).render(
  <main>
    <h1>Host selection content</h1>
    <VibePlayerInline
      autoHideControls={false}
      footer={<p>Host footer information</p>}
      header={<p>Host header information</p>}
      source={createSource("file")}
      title="Selection fixture title"
      topActions={
        <>
          <input aria-label="Host note" defaultValue="Editable host note" />
          {/* biome-ignore lint/a11y/useSemanticElements: this consumer fixture verifies rich-text editing separately from the native input. */}
          <span
            aria-label="Host editor"
            contentEditable
            role="textbox"
            suppressContentEditableWarning
            tabIndex={0}
          >
            Editable host text
          </span>
        </>
      }
    />
  </main>
);
