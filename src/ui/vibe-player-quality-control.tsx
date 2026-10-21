import {
  type FocusEvent,
  type KeyboardEvent,
  useId,
  useRef,
  useState,
} from "react";
import {
  canRenderVibePlayerQualityOptions,
  getSelectedVibePlayerQualityOption,
  type VibePlayerCapabilities,
  type VibePlayerQualityOption,
} from "../core";
import { CheckIcon, ChevronDownIcon, QualityIcon } from "./vibe-player-icons";
import { VibePlayerTooltip } from "./vibe-player-tooltip";

export interface VibePlayerQualityControlProps {
  capabilities: VibePlayerCapabilities;
  onSetQuality: ((qualityId: string) => void) | undefined;
  qualityOptions: VibePlayerQualityOption[] | undefined;
}

function getQualityMeta(option: VibePlayerQualityOption): string {
  if (option.auto) {
    return "Adaptive";
  }
  if (option.bitrate) {
    return `${Math.round(option.bitrate / 100_000) / 10} Mbps`;
  }
  return option.height ? "Fixed" : "Manual";
}

function getNextOptionIndex(index: number, offset: number, total: number) {
  return (index + offset + total) % total;
}

export function VibePlayerQualityControl({
  capabilities,
  onSetQuality,
  qualityOptions,
}: VibePlayerQualityControlProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedOption = getSelectedVibePlayerQualityOption(qualityOptions);
  const canRender = canRenderVibePlayerQualityOptions(
    capabilities,
    qualityOptions
  );

  if (!(canRender && onSetQuality && qualityOptions && selectedOption)) {
    return null;
  }
  const availableOptions = qualityOptions;
  const setQuality = onSetQuality;

  const selectedIndex = Math.max(
    0,
    availableOptions.findIndex((option) => option.id === selectedOption.id)
  );

  function focusOption(index: number): void {
    optionRefs.current[index]?.focus();
  }

  function openMenu(targetIndex: number): void {
    setOpen(true);
    window.setTimeout(() => focusOption(targetIndex), 0);
  }

  function closeMenu(): void {
    setOpen(false);
  }

  function chooseQuality(qualityId: string): void {
    setQuality(qualityId);
    closeMenu();
    triggerRef.current?.focus();
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>): void {
    const { relatedTarget } = event;
    if (
      relatedTarget instanceof Node &&
      event.currentTarget.contains(relatedTarget)
    ) {
      return;
    }
    closeMenu();
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>): void {
    const opensForward =
      event.key === "ArrowDown" || event.key === "Enter" || event.key === " ";
    if (opensForward || event.key === "ArrowUp") {
      event.preventDefault();
      openMenu(selectedIndex);
    }
  }

  function handleOptionKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
    qualityId: string
  ): void {
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      triggerRef.current?.focus();
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const offset = event.key === "ArrowDown" ? 1 : -1;
      focusOption(getNextOptionIndex(index, offset, availableOptions.length));
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      focusOption(event.key === "Home" ? 0 : availableOptions.length - 1);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      chooseQuality(qualityId);
    }
  }

  return (
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions lint/a11y/noStaticElementInteractions: the wrapper closes this composite button/listbox when focus leaves its owned controls.
    <div className="vibe-player-quality-control" onBlur={handleBlur}>
      <VibePlayerTooltip align="end" label="Quality">
        <button
          aria-controls={open ? menuId : undefined}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={`Quality ${selectedOption.label}`}
          className="vibe-player-quality-control__trigger"
          onClick={() => setOpen((value) => !value)}
          onKeyDown={handleTriggerKeyDown}
          ref={triggerRef}
          type="button"
        >
          <QualityIcon />
          <span className="vibe-player-quality-control__value">
            {selectedOption.label}
          </span>
          <ChevronDownIcon />
        </button>
      </VibePlayerTooltip>
      {open ? (
        <div
          aria-label="Quality"
          className="vibe-player-quality-control__menu"
          id={menuId}
          role="listbox"
        >
          {availableOptions.map((option, index) => (
            <button
              aria-selected={option.id === selectedOption.id}
              className="vibe-player-quality-control__option"
              data-selected={option.id === selectedOption.id}
              key={option.id}
              onClick={() => chooseQuality(option.id)}
              onKeyDown={(event) =>
                handleOptionKeyDown(event, index, option.id)
              }
              ref={(element) => {
                optionRefs.current[index] = element;
              }}
              role="option"
              type="button"
            >
              <span className="vibe-player-quality-control__option-copy">
                <span className="vibe-player-quality-control__option-label">
                  {option.label}
                </span>
                <span className="vibe-player-quality-control__option-meta">
                  {getQualityMeta(option)}
                </span>
              </span>
              {option.id === selectedOption.id ? <CheckIcon /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
