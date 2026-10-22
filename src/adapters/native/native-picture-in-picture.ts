interface WebKitPresentationVideo extends HTMLVideoElement {
  webkitPresentationMode?: string;
  webkitSetPresentationMode?: (mode: "inline" | "picture-in-picture") => void;
  webkitSupportsPresentationMode?: (mode: "picture-in-picture") => boolean;
}

function hasStandardPictureInPicture(video: HTMLVideoElement): boolean {
  return Boolean(
    video.ownerDocument.pictureInPictureEnabled && video.requestPictureInPicture
  );
}

export function canUseNativePictureInPicture(
  video: HTMLVideoElement | null
): boolean {
  if (!video || video.disablePictureInPicture) {
    return false;
  }
  const webkit = video as WebKitPresentationVideo;
  return (
    hasStandardPictureInPicture(video) ||
    Boolean(
      webkit.webkitSetPresentationMode &&
        webkit.webkitSupportsPresentationMode?.("picture-in-picture")
    )
  );
}

export function isNativePictureInPicture(
  video: HTMLVideoElement | null
): boolean {
  return Boolean(
    video &&
      (video.ownerDocument.pictureInPictureElement === video ||
        (video as WebKitPresentationVideo).webkitPresentationMode ===
          "picture-in-picture")
  );
}

export async function exitNativePictureInPicture(
  video: HTMLVideoElement | null
): Promise<void> {
  if (!video) {
    return;
  }
  if (video.ownerDocument.pictureInPictureElement === video) {
    await video.ownerDocument.exitPictureInPicture?.();
  } else if (
    (video as WebKitPresentationVideo).webkitPresentationMode ===
    "picture-in-picture"
  ) {
    (video as WebKitPresentationVideo).webkitSetPresentationMode?.("inline");
  }
}

export async function enterNativePictureInPicture(
  video: HTMLVideoElement | null
): Promise<void> {
  if (!(video && canUseNativePictureInPicture(video))) {
    return;
  }
  if (isNativePictureInPicture(video)) {
    await exitNativePictureInPicture(video);
  } else if (hasStandardPictureInPicture(video)) {
    await video.requestPictureInPicture();
  } else {
    (video as WebKitPresentationVideo).webkitSetPresentationMode?.(
      "picture-in-picture"
    );
  }
}
