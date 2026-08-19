import { useState } from "react";
import { SCRIPTS } from "../timelapse/scripts";
import { useIsDesktopWidth } from "../components/overlays/use-is-desktop-width";
import { APP_URL, markIntroSeen, storyUrl } from "./nav";

// The same filter the first-run modal applies: "Your Current Config" is a
// passthrough that only advances time on a posture you already built, which
// means nothing to someone arriving from the introduction.
const STORY_CHOICES = SCRIPTS.filter((s) => s.type !== "passthrough");

/**
 * The final slide's two CTAs. The story button expands into the real list
 * rather than hard-coding one script — reading `SCRIPTS` directly means the
 * choices here can't drift from the app's.
 *
 * Each choice is a plain link to `?story=<id>`; App.tsx starts the script on
 * mount and strips the param.
 *
 * Below the app's width gate these links go nowhere: the app would mount,
 * `DesktopGate` would replace it, and its only button leads back here — a loop
 * out of the introduction and straight back into it. So on a narrow screen we
 * don't offer them at all and say why instead. The introduction itself stays
 * fully readable; it's built for a phone. Only the links into the instrument
 * are withheld.
 */
export function StoryPicker() {
  const [choosing, setChoosing] = useState(false);
  const isDesktop = useIsDesktopWidth();

  if (!isDesktop) {
    return (
      <div className="mt-4 rounded-lg border border-gray-800 bg-gray-900/60 px-4 py-3.5">
        <div className="text-sm font-medium text-gray-200">
          🖥️ The instrument needs a desktop
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-gray-400">
          That's the end of the introduction — you've read the whole thing. The
          simulation itself is a map with side panels and a timeline, so it needs
          a wider screen. Open this page on a desktop or laptop to run the
          stories and build a posture of your own.
        </p>
      </div>
    );
  }

  if (choosing) {
    return (
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm text-gray-400">Choose a story to watch</span>
          {/* "Cancel", not "← Back": the deck's own Back button is on screen
              too, and two of them is ambiguous by sight and to a screen reader. */}
          <button
            onClick={() => setChoosing(false)}
            className="text-sm text-gray-500 hover:text-gray-300"
          >
            Cancel
          </button>
        </div>
        <div className="space-y-1.5">
          {STORY_CHOICES.map((script) => (
            <a
              key={script.id}
              href={storyUrl(script.id)}
              onClick={markIntroSeen}
              className="group block rounded-lg bg-gray-800 px-3 py-2 transition-colors hover:bg-gray-700"
            >
              <div className="text-sm font-medium text-gray-100 group-hover:text-white">
                ▶ {script.name}
              </div>
              <div className="text-sm text-gray-500 group-hover:text-gray-400">
                {script.description}
              </div>
            </a>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
      <button
        onClick={() => setChoosing(true)}
        className="flex-1 rounded-lg bg-violet-600 px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-violet-500"
      >
        ▶ Watch a 1-min story
      </button>
      <a
        href={APP_URL}
        onClick={markIntroSeen}
        className="flex-1 rounded-lg bg-gray-800 px-4 py-2.5 text-center text-sm font-medium text-gray-200 transition-colors hover:bg-gray-700"
      >
        Open the app →
      </a>
    </div>
  );
}
