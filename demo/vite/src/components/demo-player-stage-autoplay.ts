import type { VibePlayerController } from "@vibe-code/vibe-player";

interface StartDemoAutoplayInput {
  controller: VibePlayerController;
  isCancelled: () => boolean;
  mutedBootstrap: boolean;
}

export async function startDemoAutoplay({
  controller,
  isCancelled,
  mutedBootstrap,
}: StartDemoAutoplayInput): Promise<void> {
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
