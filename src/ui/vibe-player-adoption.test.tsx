import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { VibePlayerController } from "../core/vibe-player-controller";
import { VibePlayerCompact } from "./vibe-player-compact";
import { VibePlayerHeadless } from "./vibe-player-headless";
import { VibePlayerInline } from "./vibe-player-inline";
import {
  createStageAdapterFactory,
  getPlayerAnnouncer,
  getStageAdapter,
  getStageMediaElement,
  stageFileSource,
} from "./vibe-player-stage-test-helpers";
import type { VibePlayerIconProps } from "./vibe-player-ui-types";

afterEach(cleanup);

describe("inline adoption", () => {
  it("keeps both the engine and caption downloads idle until Play", async () => {
    const { adapterFactory, adapters } = createStageAdapterFactory({
      configure: (adapter) => {
        adapter.capabilities.canShowCaptions = true;
      },
    });
    const loadCaptionText = vi.fn(
      async () => "WEBVTT\n\n00:00:00.000 --> 00:00:02.000\nFirst caption"
    );
    render(
      <VibePlayerInline
        adapterFactory={adapterFactory}
        loadCaptionText={loadCaptionText}
        source={{
          ...stageFileSource,
          captions: [
            {
              id: "en",
              kind: "captions",
              label: "English",
              language: "en",
              url: "/captions.vtt",
            },
          ],
        }}
      />
    );
    expect(adapters).toHaveLength(0);
    expect(loadCaptionText).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Pause" })).toBeVisible()
    );
    expect(screen.getByText("First caption")).toBeVisible();
  });

  it("preserves host focus and scopes keyboard playback to the player", async () => {
    render(<input aria-label="Message" />);
    const input = screen.getByRole("textbox", { name: "Message" });
    input.focus();
    const { adapterFactory, adapters } = createStageAdapterFactory();
    render(
      <VibePlayerCompact
        adapterFactory={adapterFactory}
        source={stageFileSource}
      />
    );
    expect(document.activeElement).toBe(input);
    fireEvent.keyDown(input, { key: "k" });
    expect(adapters).toHaveLength(0);
    const player = screen.getByRole("region", {
      name: "Stage demo video player",
    });
    player.focus();
    fireEvent.keyDown(player, { key: "k" });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Pause" })).toBeVisible()
    );
  });

  it("renders host copy, icons and time formatting before activation", () => {
    function HostPlay(props: VibePlayerIconProps) {
      return (
        <svg {...props} data-testid="host-play-icon">
          <title>Host play icon</title>
          <path d="M1 1h2" />
        </svg>
      );
    }
    const { adapterFactory, adapters } = createStageAdapterFactory();
    render(
      <VibePlayerCompact
        adapterFactory={adapterFactory}
        formatTime={(seconds) => `${seconds} seconds`}
        icons={{ play: HostPlay }}
        labels={{ play: "Watch clip" }}
        source={{ ...stageFileSource, durationSeconds: 83 }}
      />
    );
    expect(
      within(screen.getByRole("button", { name: "Watch clip" })).getByTestId(
        "host-play-icon"
      )
    ).toBeInTheDocument();
    expect(screen.getByText("83 seconds")).toBeVisible();
    expect(adapters).toHaveLength(0);
  });

  it("toggles controls on touch taps without pausing the media", async () => {
    const { adapterFactory, adapters } = createStageAdapterFactory({
      configure: (adapter) =>
        adapter.setSnapshot({
          ...adapter.getSnapshot(),
          paused: false,
          readyState: "playing",
        }),
    });
    const { container } = render(
      <VibePlayerCompact
        adapterFactory={adapterFactory}
        load="eager"
        source={stageFileSource}
      />
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Pause" })).toBeVisible()
    );
    const media = getStageMediaElement(container);
    const tap = () => {
      const pointer = new Event("pointerdown", { bubbles: true });
      Object.defineProperty(pointer, "pointerType", { value: "touch" });
      fireEvent(media, pointer);
      fireEvent.click(media);
    };
    tap();
    expect(screen.queryByRole("button", { name: "Pause" })).toBeNull();
    tap();
    expect(screen.getByRole("button", { name: "Pause" })).toBeVisible();
    expect(getStageAdapter(adapters).calls).not.toContain("pause");
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: "Play" })).toHaveLength(2)
    );
  });

  it("keeps an explicit Replay action after ending and starts again at zero", async () => {
    const { adapterFactory, adapters } = createStageAdapterFactory();
    render(
      <VibePlayerCompact
        adapterFactory={adapterFactory}
        source={stageFileSource}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Play" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Pause" })).toBeVisible()
    );
    act(() =>
      getStageAdapter(adapters).emitEvent("ended", {
        currentTime: 100,
        paused: true,
        readyState: "ended",
      })
    );
    fireEvent.click(screen.getByRole("button", { name: "Replay" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Pause" })).toBeVisible()
    );
    expect(getStageAdapter(adapters).calls).toContain("seek:0");
  });

  it("offers Retry after an error and renews before playing the recovered source", async () => {
    let failFirstLoad = true;
    const { adapterFactory, adapters } = createStageAdapterFactory({
      configure: (adapter) => {
        if (failFirstLoad) {
          failFirstLoad = false;
          adapter.loadError = new Error("The delivery failed.");
        }
      },
    });
    const renewSource = vi.fn(async () => ({
      ...stageFileSource,
      sources: [
        { mimeType: "video/mp4", url: "https://example.com/refreshed.mp4" },
      ],
    }));
    render(
      <VibePlayerCompact
        adapterFactory={adapterFactory}
        load="eager"
        renewSource={renewSource}
        source={stageFileSource}
      />
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Retry" })).toBeVisible()
    );
    expect(getPlayerAnnouncer()).toHaveTextContent("Playback unavailable");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Pause" })).toBeVisible()
    );
    expect(renewSource).toHaveBeenCalledTimes(1);
    expect(adapters.at(-1)?.calls).toContain("play");
  });

  it("renders a bare, host-addressable video without creating an engine", async () => {
    const { adapterFactory, adapters } = createStageAdapterFactory();
    const controllerRef = createRef<VibePlayerController>();
    const { container } = render(
      <VibePlayerHeadless
        adapterFactory={adapterFactory}
        controllerRef={controllerRef}
        source={stageFileSource}
        videoProps={{ controls: true, "data-voice-player": "voice-focus" }}
      />
    );
    const video = container.firstElementChild;
    expect(video).toBeInstanceOf(HTMLVideoElement);
    expect(video).toHaveAttribute("preload", "none");
    expect(video).toHaveAttribute("data-voice-player", "voice-focus");
    expect(adapters).toHaveLength(0);
    await act(() => controllerRef.current?.play());
    expect(getStageAdapter(adapters).calls).toContain("play");
  });
});
