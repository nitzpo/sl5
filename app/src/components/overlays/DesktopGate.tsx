// The instrument needs a desktop: it's a pan/zoom map with two side panels and a
// timeline track, and there is no phone layout for it.
//
// This used to be an overlay — `md:hidden fixed inset-0` painted over a fully
// mounted app. Two things went wrong with that. The first-run modal sat at the
// same z-index and, rendering later, painted on top of the gate that was meant to
// have stopped the reader. And because the app underneath was really there, its
// panels and floating controls laid out at desktop widths and pushed the page
// wider than the viewport, so the gate scrolled off to one side — the text ended
// up cropped at the right edge and low on the screen.
//
// So this is a gate, not a scrim: `App` returns it *instead of* the app, nothing
// else mounts, and the layout can't be shoved around by content that isn't there.
//
// Deliberately a media query and not a user-agent sniff or a touch check: what
// makes the app unusable is available width, and a tablet in landscape or a phone
// rotated past the breakpoint is genuinely fine.
//
// The CTA is conditional because this gate used to close a loop. Someone on a
// phone finishing the introduction would tap a story, land here, and the only
// button offered sent them back to the introduction they had just read. So when
// the reader arrived from the intro — a `?story=` link, or any intro referrer —
// we say the story can't play here and leave the exit to the browser's Back
// button, which goes where they actually want. The intro CTA is still shown to
// someone who arrived cold, since for them it's the one thing that does work.

// The width check itself lives in `./use-is-desktop-width`, so this file only
// exports a component.

export function DesktopGate() {
  // A story link is the specific case worth naming: the reader chose a thing to
  // watch and it isn't going to play, which deserves a better explanation than a
  // generic width warning.
  const params = new URLSearchParams(window.location.search);
  const fromStory = params.has("story");
  const fromIntro =
    fromStory || document.referrer.includes(`${import.meta.env.BASE_URL}intro`);

  return (
    // `fixed` and `inset-0` rather than a flow-layout screen: with nothing else
    // mounted there is no content to push this around, and pinning it to the
    // viewport means it can't be scrolled away from. `100dvh` so mobile browser
    // chrome doesn't cut the bottom off.
    <div
      className="sl5 fixed inset-0 flex flex-col justify-center overflow-y-auto bg-paper px-6 py-10 font-archivo text-ink"
      style={{ minHeight: "100dvh" }}
    >
      <div className="mx-auto w-full max-w-[340px]">
        <div className="text-[44px] leading-none font-black tracking-tight">SL5</div>
        <div className="mt-1 border-b-2 border-ink pb-3 text-[16px] font-medium text-ink-2">Explorable</div>
        <h1 className="mt-5 text-[28px] leading-tight font-extrabold">Desktop required</h1>
        <p className="mt-2 text-[16px] leading-relaxed text-ink-2">
          {fromStory
            ? "That story runs inside the explorable — a catalogue of defenses beside a verdict rail, which needs a wider screen. Open this link on a desktop or laptop to watch it."
            : "The explorable lays out the whole catalogue of defenses beside its verdict, and needs a wider screen. Open it on a desktop or laptop."}
        </p>

        {/* Only for someone who hasn't just come from the introduction —
            otherwise this button is the return leg of a loop. */}
        {!fromIntro && (
          <>
            <a
              href={`${import.meta.env.BASE_URL}intro/`}
              className="mt-6 flex items-center justify-between bg-ink px-5 py-4 text-[16px] font-bold text-paper"
            >
              Read the six-minute introduction <span aria-hidden="true">→</span>
            </a>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
              Why model weights are a target, and how the instrument works. Written to read on a phone.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
