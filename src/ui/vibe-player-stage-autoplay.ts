import type { VibePlayerControllerState } from "../core";

export interface VibePlayerAutoplayController {
  getState: () => VibePlayerControllerState;
  play: () => Promise<void>;
  setMuted: (value: boolean) => Promise<void>;
}

export interface VibePlayerAutoplayOptions {
  controller: VibePlayerAutoplayController;
  isCancelled: () => boolean;
  mutedBootstrap: boolean;
}

export async function startVibePlayerAutoplay({
  controller,
  isCancelled,
  mutedBootstrap,
}: VibePlayerAutoplayOptions): Promise<void> {
  if (!mutedBootstrap) {
    await controller.play();
    return;
  }

  const wasMuted = controller.getState().snapshot.muted;
  if (wasMuted) {
    await controller.play();
    return;
  }

  await controller.setMuted(true);
  if (isCancelled()) {
    return;
  }
  await controller.play();
}
