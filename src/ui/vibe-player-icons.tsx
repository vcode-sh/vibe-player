import type { ReactNode } from "react";
import { useVibePlayerUI } from "./vibe-player-ui-context";
import type {
  VibePlayerIconProps,
  VibePlayerIcons,
} from "./vibe-player-ui-types";

interface VibePlayerIconBaseProps extends VibePlayerIconProps {
  children: ReactNode;
  icon: keyof VibePlayerIcons;
}

function VibePlayerIconBase({
  children,
  icon,
  ...props
}: VibePlayerIconBaseProps) {
  const { icons } = useVibePlayerUI();
  const CustomIcon =
    icons[icon] ??
    (icon === "volumeHigh" || icon === "volumeLow" ? icons.volume : undefined);
  if (CustomIcon) {
    return (
      <CustomIcon
        aria-hidden
        className="vibe-player-controls__icon"
        focusable="false"
        {...props}
      />
    );
  }
  return (
    <svg
      aria-hidden
      className="vibe-player-controls__icon"
      fill="none"
      focusable="false"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      {...props}
    >
      {children}
    </svg>
  );
}

export function CaptionsIcon(props: VibePlayerIconProps) {
  return (
    <VibePlayerIconBase icon="captions" {...props}>
      <rect height="14" rx="2" width="18" x="3" y="5" />
      <path d="M7 10h4M13 10h4M7 14h6M15 14h2" />
    </VibePlayerIconBase>
  );
}

export function CloseIcon(props: VibePlayerIconProps) {
  return (
    <VibePlayerIconBase icon="close" {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </VibePlayerIconBase>
  );
}

export function CheckIcon(props: VibePlayerIconProps) {
  return (
    <VibePlayerIconBase icon="check" {...props}>
      <path d="M20 6 9 17l-5-5" />
    </VibePlayerIconBase>
  );
}

export function ChevronDownIcon(props: VibePlayerIconProps) {
  return (
    <VibePlayerIconBase icon="chevronDown" {...props}>
      <path d="m6 9 6 6 6-6" />
    </VibePlayerIconBase>
  );
}

export function EnterFullscreenIcon(props: VibePlayerIconProps) {
  return (
    <VibePlayerIconBase icon="fullscreenEnter" {...props}>
      <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
    </VibePlayerIconBase>
  );
}

export function ExitFullscreenIcon(props: VibePlayerIconProps) {
  return (
    <VibePlayerIconBase icon="fullscreenExit" {...props}>
      <path d="M3 8h5V3M16 3v5h5M3 16h5v5M16 21v-5h5" />
    </VibePlayerIconBase>
  );
}

export function MuteIcon(props: VibePlayerIconProps) {
  return (
    <VibePlayerIconBase icon="mute" {...props}>
      <path d="M4 9v6h4l5 4V5L8 9H4zM18 9l3 3M21 9l-3 3" />
    </VibePlayerIconBase>
  );
}

export function PauseIcon(props: VibePlayerIconProps) {
  return (
    <VibePlayerIconBase icon="pause" {...props}>
      <path d="M8 5v14M16 5v14" />
    </VibePlayerIconBase>
  );
}

export function PictureInPictureIcon(props: VibePlayerIconProps) {
  return (
    <VibePlayerIconBase icon="pictureInPicture" {...props}>
      <rect height="14" rx="2" width="18" x="3" y="5" />
      <rect height="5" rx="1" width="7" x="12" y="12" />
    </VibePlayerIconBase>
  );
}

export function PlayIcon(props: VibePlayerIconProps) {
  return (
    <VibePlayerIconBase icon="play" {...props}>
      <path d="M8 5v14l11-7-11-7z" />
    </VibePlayerIconBase>
  );
}

export function QualityIcon(props: VibePlayerIconProps) {
  return (
    <VibePlayerIconBase icon="settings" {...props}>
      <path d="M4 7h8M16 7h4M14 5v4M4 12h3M11 12h9M9 10v4M4 17h11M19 17h1M17 15v4" />
    </VibePlayerIconBase>
  );
}

export function VolumeIcon(props: VibePlayerIconProps) {
  return (
    <VibePlayerIconBase icon="volumeHigh" {...props}>
      <path d="M4 9v6h4l5 4V5L8 9H4zM17 9.5a4 4 0 0 1 0 5M19.5 7a7 7 0 0 1 0 10" />
    </VibePlayerIconBase>
  );
}

export function ReplayIcon(props: VibePlayerIconProps) {
  return (
    <VibePlayerIconBase icon="replay" {...props}>
      <path d="M3 10a9 9 0 1 1 2 8M3 4v6h6" />
    </VibePlayerIconBase>
  );
}

export function RetryIcon(props: VibePlayerIconProps) {
  return (
    <VibePlayerIconBase icon="retry" {...props}>
      <path d="M3 10a9 9 0 1 1 2 8M3 4v6h6" />
    </VibePlayerIconBase>
  );
}

export function VolumeLowIcon(props: VibePlayerIconProps) {
  return (
    <VibePlayerIconBase icon="volumeLow" {...props}>
      <path d="M4 9v6h4l5 4V5L8 9H4zM17 9.5a4 4 0 0 1 0 5" />
    </VibePlayerIconBase>
  );
}

export function UnavailableIcon(props: VibePlayerIconProps) {
  return (
    <VibePlayerIconBase icon="unavailable" {...props}>
      <path d="M3 3l18 18M15 11v-1l4.6-2.3A1 1 0 0 1 21 8.6v6.8M10 6h3a2 2 0 0 1 2 2v3m0 4v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h1" />
    </VibePlayerIconBase>
  );
}
