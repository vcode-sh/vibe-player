import { createRoot } from "react-dom/client";
import "vibe-player/styles.css";
import { CustomPlayer, inline, modal, stage } from "./recipes";

const target = document.getElementById("app");
if (!target) {
  throw new Error("Consumer app target is missing.");
}
createRoot(target).render(
  <main>
    {stage}
    {inline}
    {modal}
    <CustomPlayer />
  </main>
);
