import { MuteIcon, VolumeIcon } from "./vibe-player-icons";

export interface VibePlayerVolumeIconProps {
  silent: boolean;
}

export function VibePlayerVolumeIcon({ silent }: VibePlayerVolumeIconProps) {
  return silent ? <MuteIcon /> : <VolumeIcon />;
}
