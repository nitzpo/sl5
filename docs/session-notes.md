# Session Notes — Defense Rings & UI Fixes

## What was done (merged to main via PR #2)

1. **Defense Rings view** — concentric ring visualization showing blocks by defense-in-depth layer
   - 8 layers: accelerator → host → network → physical → access → monitoring → personnel → supply chain
   - Layer alias resolution for non-canonical names
   - Block angular positioning with 40° dead zone at top to avoid label collision
   - Per-ring stagger with modulo wrapping to prevent overflow into dead zone

2. **UI fixes:**
   - Zoom control dynamically shifts left when right panels open (ResizeObserver)
   - Tooltip positioning fixed under CSS scale transform (createPortal to body)
   - Timeline bucket hover popup positioning
   - Mobile "Desktop Required" gate

3. **Grid/Rings toggle** in main view area

## Unmerged branches

- `opensource-prep` — 1 commit: "allow hiding the timeline panel during time-lapse playback"
- `fable`, `feature/defense-rings`, `feature/time-lapse`, `fix-hide-timeline` — no additional commits vs main

## Key implementation details

### Ring geometry (`app/src/utils/ring-geometry.ts`)
- `RING_CENTER = {x:310, y:310}`, `RING_RADII = [50,82,114,146,180,214,248,282]`
- `blockAngle()`: excludes PI/9 (~20°) each side of top = 40° dead zone, distributes blocks across remaining arc, uses `ringIdx * 0.35` stagger wrapped with modulo
- `LAYER_ALIAS_MAP`: maps non-canonical layer names (e.g. "detection" → "monitoring_detection")

### Defense rings collision fix iterations (for context)
Failed approaches:
1. Nudge individual blocks near label → ugly, unpredictable
2. Move labels to largest gap → labels jump erratically
3. Large per-ring stagger → blocks cluster across rings

Working approach: fixed dead zone at top where no blocks go + modulo-wrapped ring offset.

## Next steps / ideas not yet built
- Dependency lines between blocks
- "Decision windows closing" indicator
- Animated attack chain flow
- Summary mode (10 clusters)
- Uncertainty visualization
- See `docs/fable-prompt.md` for full review prompt
