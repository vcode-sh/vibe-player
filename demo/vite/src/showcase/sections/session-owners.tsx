import { useState } from "react";
import { VibePlayerCompact } from "vibe-player";
import { landscapeSource, loadLightHls } from "../../adoption-sources";
import { withId } from "../showcase-media";
import { ShowcaseCaption } from "../showcase-section";

type Owner = "a" | "b";

const players: readonly { id: Owner; title: string }[] = [
  { id: "a", title: "Player A" },
  { id: "b", title: "Player B" },
];

interface SessionOwnersProps {
  sessionTitle: string;
}

/**
 * A host with its own focus registry decides which player owns the session.
 * These two leave audio focus to the host (`audioFocus={false}`), so both
 * can play at once.
 */
export function SessionOwners({ sessionTitle }: SessionOwnersProps) {
  const [owner, setOwner] = useState<Owner>("a");
  return (
    <div className="sc-owners">
      <div className="sc-owners__head">
        <h3>Host-chosen owner</h3>
        <fieldset className="sc-segmented">
          <legend className="sc-visually-hidden">Media Session owner</legend>
          {players.map((player) => (
            <button
              aria-pressed={owner === player.id}
              key={player.id}
              onClick={() => setOwner(player.id)}
              type="button"
            >
              {player.title}
            </button>
          ))}
        </fieldset>
      </div>
      <p className="sc-owners__note">
        Play both. The session follows the selected owner, not the last player
        to start. Session now shows:{" "}
        <strong>{sessionTitle || "nothing"}</strong>.
      </p>
      <div className="sc-grid sc-grid--two">
        {players.map((player) => (
          <figure className="sc-example" key={player.id}>
            <VibePlayerCompact
              audioFocus={false}
              loadHls={loadLightHls}
              mediaSession={{ active: owner === player.id }}
              source={{
                ...withId(landscapeSource, `system-owner-${player.id}`),
                title: player.title,
              }}
              title={player.title}
              variant="feed"
            />
            <ShowcaseCaption
              code={`mediaSession={{ active: ${owner === player.id} }}`}
            >
              {player.title}
            </ShowcaseCaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
