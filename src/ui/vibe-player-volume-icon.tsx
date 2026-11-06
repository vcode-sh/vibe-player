import { MuteIcon, VolumeIcon, VolumeLowIcon } from "./vibe-player-icons";

export interface VibePlayerVolumeIconProps {
  silent: boolean;
  volume?: number;
}

export function VibePlayerVolumeIcon({
  silent,
  volume = 1,
}: VibePlayerVolumeIconProps) {
  if (silent) {
    return <MuteIcon />;
  }
  return volume < 0.5 ? <VolumeLowIcon /> : <VolumeIcon />;
}
