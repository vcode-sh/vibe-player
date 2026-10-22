import { clearElement } from "../shared/clear-element";
import type { YouTubePlayerHandle } from "./youtube-iframe-types";

interface YouTubeMountInput {
  mountElement: HTMLElement | null;
  player: YouTubePlayerHandle | null;
  previousTarget: HTMLElement | null;
  target: HTMLElement;
}

/** The SDK replaces its mount div; subsequent mounts must retain that live iframe. */
export function mountYouTubeElement({
  mountElement,
  player,
  previousTarget,
  target,
}: YouTubeMountInput): void {
  const pendingElement = mountElement?.parentElement
    ? mountElement
    : previousTarget?.querySelector("iframe");
  const element = player?.getIframe?.() ?? pendingElement ?? mountElement;
  if (element?.parentElement === target) {
    return;
  }
  clearElement(target);
  if (!element) {
    return;
  }
  if (
    typeof target.moveBefore === "function" &&
    element.ownerDocument === target.ownerDocument &&
    element.isConnected === target.isConnected
  ) {
    target.moveBefore(element, null);
    return;
  }
  target.append(element);
}
