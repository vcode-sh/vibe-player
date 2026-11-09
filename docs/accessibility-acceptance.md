# Accessibility acceptance

Verification checkpoint: **2026-10-22**. Version **0.2.0**, released 2026-10-22.

The maintained browser and Linux assistive-technology checks pass. Physical
keyboard hardware and human screen-reader listening remain separate manual
acceptance boundaries. They are not inferred from synthetic input or an
accessibility tree.

## Evidence and limits

| Lane                                       | Verified behavior                                                                                                                                                                                                                                   | Boundary                                                                                                                                    |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Chromium automation                        | Actual browser AX tree exposes named native modal, background inertness, quality listbox/selection, volume slider, polite atomic caption status and the fullscreen toggle's pressed state. Keyboard caption retry succeeds and retains modal focus. | CDP/browser-generated keys and browser semantics; no screen-reader speech claim.                                                            |
| Linux native input                         | XTest Enter/Escape opens the player, retries captions, exits actual fullscreen while retaining the modal, closes nested popovers before the modal and restores its opener.                                                                          | OS-synthetic X11 input under Xvfb; no physical keyboard device.                                                                             |
| Linux AT-SPI                               | A real accessibility bus exposes the dialog with modal state, hides the background action and exposes controls.                                                                                                                                     | Actual platform accessibility objects in an isolated session; no macOS/Windows equivalence.                                                 |
| Orca                                       | Real Orca produces caption-error text, retry-button, fullscreen entry/exit, quality listbox and volume vertical-slider utterances.                                                                                                                  | Speech Dispatcher uses its dummy module. Generated speech is captured; speaker output, intelligibility and human listening are not tested.  |
| Physical hardware and other screen readers | Manual protocol below is ready.                                                                                                                                                                                                                     | No physical keyboard, Safari/macOS/iOS VoiceOver, Windows NVDA or braille device was available to this run. These checks remain unverified. |

The Linux checkpoint used Google Chrome **156.0.8078.47**, Orca **50.2** and
AT-SPI2 **2.60.4**. This is a tested environment, not a new minimum-support policy.
The native run captured, among other utterances:

```text
Accessibility sample ... Captions unavailable ...
status bar
Retry captions
button.
Full screen
Exit full screen.
Quality Auto
collapsed button.
opens listbox
List with 2 items
Mute, volume 100%
Volume
dialog
vertical slider
Volume 100%
100 percent.
```

That transcript predates 0.8.0, when the full stage toggle still switched to
"Exit full screen"; it now keeps "Full screen" and reports its pressed state.
On 2026-11-09, with Google Chrome 157.0.8103.38 and Orca 50.3, the native
probe's fullscreen and popover steps pass: on focus Orca says "Full screen,
toggle button not pressed", and after Enter only "pressed". Its caption step
fails on the 0.8.0 branch and on the commit it started from alike. Orca
receives the caption notice's text but does not speak it, so the caption
utterance above is not reproduced with these versions; that needs separate
investigation.

Caption failure was included in Orca's initial content utterance. This alone
does not prove the timing or uniqueness of a later live-region announcement.
The browser AX check independently verifies `live=polite` and `atomic=true`.

Native input exposed a regression: successful caption retry removed its focused
button and left focus on the document body. The Stage now focuses its existing
root before retry removes the notice. DOM and Chromium checks failed before
this fix and pass afterward.

## Announcements, reachable controls and fullscreen state

Added for 0.8.0 and covered by the Chromium lane; of the native checks, only
the fullscreen pressed state was re-run (see above).
- Each player speaks every status message through one always-mounted,
  visually hidden polite live region (`role="status"`, `aria-atomic="true"`,
  `data-part="announcer"`): delayed loading/buffering, a playback failure once,
  a caption failure, and the settled result of keyboard play, pause and seeks
  (not for a focused seek slider, which speaks its own value). A message
  clears when its status ends, or after 5 seconds. The visible Stage status
  and caption failure notice are not live regions; the busy spinner carries
  real text and the notice keeps its retry button. Only the caption text
  (`aria-live="polite"` while cues show) remains a separate region. After the
  announcement clears, the Chromium AX tree holds "Playback unavailable"
  once, from the visible compact panel.
- Hidden chrome is `aria-hidden` and `inert`. Programmatic focus entering the
  player, without key events (the way assistive technology moves focus),
  reveals the Stage and compact controls, and focus resting on a control keeps
  them open past the idle delay. Pointer presses keep their own policy, and
  neither focus the player moves back to its region nor focus returning with
  the window reveals.
- Fullscreen and Picture-in-Picture toggles in Glass, Chips and the full
  stage keep their names ("Full screen", "Picture in picture") and expose
  `aria-pressed` (WAI-ARIA APG toggle button). An `onExpand` button, which
  opens a host view, has no pressed state.

Whether a screen reader moves DOM focus at all depends on the product and its
settings (for example NVDA browse mode or VoiceOver swipe navigation), so the
reveal is only as reachable as that focus movement. Speech timing, queueing
and whether a cleared message interrupts speech are not verified; use the
manual protocol below.

## Maintained browser check

```bash
bun run build
bunx playwright test --project=chromium accessibility.browser.ts
```

`/accessibility-live.html` adds a Stage, a compact player and a compact player
whose media always fails, for the announcement and reveal cases.

The fixture at `/accessibility.html` imports public package exports and CSS,
uses committed local media, and deliberately rejects its first caption request.
Retry returns a hand-authored caption. Its standalone quality control tests
package UI semantics; it does not claim adaptive-streaming acceptance.

Tests attach browser AX trees to Playwright results and assert specific
role/name/state contracts. Existing modal and presentation cases own the wider
interaction checks.

## Optional Linux native and Orca check

Prerequisites are installed Google Chrome, Orca, Speech Dispatcher with
`sd_dummy`, Xvfb/xvfb-run, D-Bus/dbus-run-session, Python GI with Atspi and
`libXtst`. The probe installs nothing. Missing prerequisites fail the command;
they are not reported as a passing skip.

Start the local fixture in one terminal:

```bash
bun run build
bunx vite --config test/browser/vite.config.ts --host 127.0.0.1 --port 5197 --strictPort
```

Run the probe from the repository root in another terminal:

```bash
bun run test:accessibility:native
```

Use an idle test host. Orca's launcher has a user-wide instance check, so the
probe refuses to start while an Orca process exists. It never uses `--replace`.
It creates a private D-Bus session, Xvfb display, runtime/config/data/cache
directories and dummy speech socket. It does not change the active desktop's
accessibility settings or send keys to that display. Direct helpers reject
the ordinary user runtime directory.

Only key delivery uses XTest. Playwright sets up the fixture, positions focus
and observes results. This is native OS input evidence with scripted focus,
not a complete physical keyboard navigation session.

The command prints a temporary artifact directory containing `modal-atspi.json`,
`quality-atspi.json`, `volume-atspi.json`, `closed-atspi.json`, `orca.log` and
`orca-utterances.txt`. Raw Orca logs preserve generated speech and events. An
isolated Orca customization only enables line-buffered debug output. The
launcher owns a bounded process group and kills only that group on failure,
timeout or interruption. The runner closes its browser and terminates its own
Orca and Speech Dispatcher children. Private portal/FUSE/PipeWire warnings can
occur without audio devices; assertions determine the result.

## Physical keyboard and human listening protocol

Serve the same fixture and record OS, browser, screen-reader version, relevant
keyboard-navigation settings and the actual keyboard or input device. Use a
fresh test profile. Record pass/fail, the focused control and the spoken text
for each step; retain a recording or transcript when feasible.
1. With the screen reader enabled, navigate to **Open accessible player** using
   the physical keyboard and activate it. Confirm the dialog's name is
   discoverable, focus enters the player and background controls cannot be
   activated through modal navigation. Inspect Tab and Shift+Tab at both ends.
2. Reach **Quality Auto**. Open it, navigate options and verify selected state is
   announced. Escape closes only the listbox and restores its trigger. A second
   Escape closes the modal and restores **Open accessible player**.
3. Reopen and reach the volume control/slider. Verify the slider name, vertical
   orientation and percentage are announced. Change volume with arrow keys.
   Escape closes its popover first; the following Escape closes the modal.
4. Reopen. Confirm **Captions unavailable** is discoverable without interrupting
   playback. Reach **Retry captions**, activate it and confirm captions recover,
   focus remains in the player and its controls remain usable. Note whether the
   error is announced automatically, on content entry or only during reading.
5. Enter fullscreen using the package control. Verify its pressed state is
   announced and controls/captions remain available. Press physical Escape: it should exit
   browser fullscreen first while retaining the modal. A subsequent Escape may
   close the modal. Repeat entry/exit using the package button and F.
6. Close during playback, confirm audio/video stops, reopen and check there is
   one player. Verify focus restoration with keyboard and pointer closure.
7. On `/accessibility-live.html`, focus the Stage and press K, K, then the
   right arrow twice. Confirm "Playing", "Paused" and one position such as
   "0:21 of 0:24" are spoken once each. Play the broken sample and confirm
   "Playback unavailable" is spoken once.
8. Start playback with the pointer and let the controls hide. Move the screen
   reader's cursor away from the player and back. Record whether the controls
   become reachable and whether focus actually moved.

Run this protocol with Orca on supported Linux browsers, NVDA on Windows and
VoiceOver on actual macOS Safari. For iOS Safari/VoiceOver, use touch exploration
and native presentation gestures as well as a hardware keyboard when relevant;
record OS-owned presentation differences separately. Playwright WebKit and
mobile viewport emulation do not complete this hardware acceptance.
