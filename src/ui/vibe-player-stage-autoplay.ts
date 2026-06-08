import type { VibePlayerController } from "../core/vibe-player-controller";

export interface VibePlayerAutoplayOptions {
  controller: VibePlayerController;
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
  if (isCancelled()) {
    return;
  }
  await controller.setMuted(false);
}
