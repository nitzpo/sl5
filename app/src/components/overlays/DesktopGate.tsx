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

// The width check itself lives in `./use-is-desktop-width`, so this file only
// exports a component.

export function DesktopGate() {
  return (
    // `fixed` and `inset-0` rather than a flow-layout screen: with nothing else
    // mounted there is no content to push this around, and pinning it to the
    // viewport means it can't be scrolled away from. `100dvh` so mobile browser
    // chrome doesn't cut the bottom off.
    <div
      className="fixed inset-0 flex flex-col items-center justify-center overflow-y-auto bg-gray-950 px-6 py-10 text-center"
      style={{ minHeight: "100dvh" }}
    >
      <span className="mb-4 text-4xl">🖥️</span>
      <h1 className="mb-2 text-lg font-semibold text-gray-100">Desktop required</h1>
      <p className="max-w-[300px] text-sm leading-relaxed text-gray-400">
        The explorable is a map with side panels and a timeline — it needs a wider
        screen. Open this on a desktop or laptop.
      </p>

      {/* The one thing that does work here. The introduction is a separate page
          built to be read on a phone, which is the whole reason it exists as a
          shareable link. */}
      <a
        href={`${import.meta.env.BASE_URL}intro/`}
        className="mt-6 rounded-lg bg-violet-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-violet-500"
      >
        Read the 5-minute introduction →
      </a>
      <p className="mt-2.5 max-w-[300px] text-xs leading-relaxed text-gray-500">
        Why model weights are a target, and how the instrument works. Written to
        read on a phone.
      </p>
    </div>
  );
}
