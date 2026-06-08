import type { ReactNode, SVGProps } from "react";

interface VibePlayerIconProps extends SVGProps<SVGSVGElement> {}

interface VibePlayerIconBaseProps extends VibePlayerIconProps {
  children: ReactNode;
}

function VibePlayerIconBase({ children, ...props }: VibePlayerIconBaseProps) {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: control buttons provide accessible names, icons are decorative.
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
    <VibePlayerIconBase {...props}>
      <rect height="14" rx="2" width="18" x="3" y="5" />
      <path d="M7 10h4M13 10h4M7 14h6M15 14h2" />
    </VibePlayerIconBase>
  );
}

export function CloseIcon(props: VibePlayerIconProps) {
  return (
    <VibePlayerIconBase {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </VibePlayerIconBase>
  );
}

export function EnterFullscreenIcon(props: VibePlayerIconProps) {
  return (
    <VibePlayerIconBase {...props}>
      <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
    </VibePlayerIconBase>
  );
}

export function MuteIcon(props: VibePlayerIconProps) {
  return (
    <VibePlayerIconBase {...props}>
      <path d="M4 9v6h4l5 4V5L8 9H4zM18 9l3 3M21 9l-3 3" />
    </VibePlayerIconBase>
  );
}

export function PauseIcon(props: VibePlayerIconProps) {
  return (
    <VibePlayerIconBase {...props}>
      <path d="M8 5v14M16 5v14" />
    </VibePlayerIconBase>
  );
}

export function PictureInPictureIcon(props: VibePlayerIconProps) {
  return (
    <VibePlayerIconBase {...props}>
      <rect height="14" rx="2" width="18" x="3" y="5" />
      <rect height="5" rx="1" width="7" x="12" y="12" />
    </VibePlayerIconBase>
  );
}

export function PlayIcon(props: VibePlayerIconProps) {
  return (
    <VibePlayerIconBase {...props}>
      <path d="M8 5v14l11-7-11-7z" />
    </VibePlayerIconBase>
  );
}

export function VolumeIcon(props: VibePlayerIconProps) {
  return (
    <VibePlayerIconBase {...props}>
      <path d="M4 9v6h4l5 4V5L8 9H4zM17 9.5a4 4 0 0 1 0 5M19.5 7a7 7 0 0 1 0 10" />
    </VibePlayerIconBase>
  );
}
