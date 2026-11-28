import { useState } from "react";
import { SCRIPTS } from "../timelapse/scripts";
import { useIsDesktopWidth } from "../components/overlays/use-is-desktop-width";
import { APP_URL, markIntroSeen, storyUrl } from "./nav";

// The same filter the first-run modal applies: "Your Current Config" is a
// passthrough that only advances time on a posture the reader built, which
// means nothing to someone arriving from the introduction.
const STORY_CHOICES = SCRIPTS.filter((s) => s.type !== "passthrough");

/**
 * The last slide's two calls to action: open the instrument, or watch a
 * one-minute scenario. Each scenario is a plain link to `?story=<id>`; App.tsx
 * starts the script on mount.
 *
 * Below the instrument's width gate these links would lead to its "desktop
 * required" screen, whose only way out is back here. So on a narrow screen
 * they aren't offered, and the reader is told why.
 */
export function StoryPicker() {
  const [choosing, setChoosing] = useState(false);
  const isDesktop = useIsDesktopWidth();

  if (!isDesktop) {
    return (
      <div className="border-t-2 border-ink pt-3">
        <p className="text-[16px] font-semibold text-ink">The instrument needs a desktop</p>
        <p className="mt-1 max-w-[40rem] text-[14px] leading-[1.55] text-ink-2">
          That's the end of the introduction. The instrument itself is a catalogue with a verdict beside it, so it needs
          a wider screen. Open this page on a desktop or laptop to build a posture of your own.
        </p>
      </div>
    );
  }

  if (choosing) {
    return (
      <div className="border-t-2 border-ink pt-3">
        <div className="flex items-center justify-between gap-3">
          <p className="cap">Choose a scenario to watch</p>
          {/* "Cancel", not "Back": the deck's own Back button is on screen too. */}
          <button
            type="button"
            onClick={() => setChoosing(false)}
            className="min-h-[36px] px-2 text-[14px] text-ink-2 underline underline-offset-4 hover:text-ink"
          >
            Cancel
          </button>
        </div>
        <ul className="mt-2">
          {STORY_CHOICES.map((script) => (
            <li key={script.id} className="border-t border-rule">
              <a
                href={storyUrl(script.id)}
                onClick={markIntroSeen}
                className="group block py-2.5 hover:bg-tint"
              >
                <span className="block text-[16px] font-semibold text-ink">▶ {script.name}</span>
                <span className="block text-[14px] text-ink-2">{script.description}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 border-t-2 border-ink pt-4 sm:flex-row">
      <a
        href={APP_URL}
        onClick={markIntroSeen}
        className="inline-flex min-h-[48px] items-center justify-center bg-ink px-6 text-[16px] font-semibold text-paper hover:bg-ink-2"
      >
        Open the instrument →
      </a>
      <button
        type="button"
        onClick={() => setChoosing(true)}
        className="inline-flex min-h-[48px] items-center justify-center border-2 border-ink px-6 text-[16px] font-semibold text-ink hover:bg-tint"
      >
        ▶ Watch a 1-minute scenario
      </button>
    </div>
  );
}
