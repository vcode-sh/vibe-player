export function canUseNativePictureInPicture(
  video: HTMLVideoElement | null
): boolean {
  if (!video) {
    return false;
  }
  return Boolean(
    document.pictureInPictureEnabled &&
      "requestPictureInPicture" in video &&
      !video.disablePictureInPicture
  );
}

export async function enterNativePictureInPicture(
  video: HTMLVideoElement | null
): Promise<void> {
  if (!(video && canUseNativePictureInPicture(video))) {
    return;
  }
  if (document.pictureInPictureElement === video) {
    await document.exitPictureInPicture();
    return;
  }
  await video.requestPictureInPicture();
}
