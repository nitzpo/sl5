# site/: the version picker at /sl5/

GitHub Pages serves two builds of the explorable side by side, plus this folder
at the root:

| URL | What | Source |
|---|---|---|
| `/sl5/` | Version picker | `site/index.html` |
| `/sl5/intro/` | Redirect to `/sl5/v1/intro/` | `site/intro/index.html` |
| `/sl5/v2/`, `/sl5/v2/intro/` | Current app | `app/` in the deployed commit |
| `/sl5/v1/`, `/sl5/v1/intro/` | Original app, frozen | `app/` at `V1_SHA` in `.github/workflows/deploy.yml` |

Everything here is plain static HTML and CSS with no build step. Fonts (Archivo,
IBM Plex Mono) come from Google Fonts. The styles follow the v2 "Swiss signal"
system: paper `#F4F3EE`, ink `#111110`, one signal red `#C4301A` (only the
"New" tag), and a dark palette under `prefers-color-scheme: dark`.

## How the deploy assembles it

`.github/workflows/deploy.yml`, on push to `main`:

1. Builds v2 from the checked-out commit:
   `npx vite build --base /sl5/v2/ --outDir dist/v2`.
2. Checks out `V1_SHA` in a git worktree (the job fetches full history), runs
   `npm ci` there against v1's own lockfile, and builds it with
   `--base /sl5/v1/` into `dist/v1`.
3. Copies `site/index.html`, `site/intro/index.html` and `site/thumbs/*.webp`
   into the root of `dist/`. This README and the capture script stay behind.
4. Uploads `dist/` as the Pages artifact.

`--base` on the command line overrides `base: '/sl5/'` in `app/vite.config.ts`.
The apps build every asset, data and intro URL from `import.meta.env.BASE_URL`,
so each version stays inside its own prefix.

## Old links

Before the split, the app lived at `/sl5/` and its introduction at `/sl5/intro/`.

- **`/sl5/` with state.** A query or hash on `/sl5/` is v1 state: Share links
  (`#state=…`), story links (`?story=…`) and hand-offs from the old intro. The
  landing page's first script forwards these to `/sl5/v1/` with the query and
  hash unchanged. It uses `location.replace`, so the picker never appears in
  Back. Campaign tags alone (`utm_*`, `fbclid`, `gclid`, `msclkid`, `ref`) are
  not state, so those visitors stay on the picker.
- **`/sl5/intro/`** forwards to `/sl5/v1/intro/` with the query and hash, so
  slide deep links such as `#the-oc-ladder` still land on their slide. Without
  JavaScript, a `<meta http-equiv="refresh">` in `<noscript>` does the same,
  minus the hash. It sits in `<noscript>` so it can never race the scripted
  redirect.

## Thumbnails

`thumbs/v1.webp` and `thumbs/v2.webp` are 1200×750 WebP. Each is a 1600×1000
capture of the app's main screen at device scale factor 1, with the first-run
modal dismissed. `capture-thumbnails.mjs` makes them. It needs Playwright with
Chromium (see `app/.claude/skills/run-sl5-app/SKILL.md`, and set `PLAYWRIGHT_DIR`
if Playwright isn't resolvable from the repo).

```bash
# Both versions. Builds v2 from the working tree (needs `npm ci` in app/) and v1
# from V1_SHA in a temporary worktree, serves them under /sl5/, then captures.
node site/capture-thumbnails.mjs

# Just v2, e.g. after a UI change. v1 is frozen and rarely needs a new capture.
node site/capture-thumbnails.mjs --only v2

# Capture an already assembled dist/ (dist/v1, dist/v2), with no build.
node site/capture-thumbnails.mjs --dist dist

# Use an image instead of a capture. It is cover-cropped to 16:10 and resized.
node site/capture-thumbnails.mjs --only v2 --image v2=path/to/mockup.jpg
```

Both thumbnails are captures of the real apps: v2's is its default main screen
(the stage matrix with the verdict rail, SL1 in 2026). After a visible change to
v2's main screen, run `node site/capture-thumbnails.mjs --only v2`, open
`site/thumbs/v2.webp` to check it shows the catalogue with no modal over it, and
commit it. If the screen no longer matches the description, update the v2 `alt`
text and copy in `index.html` as well. The root README's `assets/screenshot.png`
is the same screen at full size (1600×1000 PNG).

## Preview locally

Assemble `dist/` the way the workflow does, then serve its parent so that
`dist/` appears at `/sl5/`:

```bash
REPO=$PWD
V1_SHA=$(sed -n 's/^ *V1_SHA: *//p' .github/workflows/deploy.yml)
(cd app && npx vite build --base /sl5/v2/ --outDir "$REPO/dist/v2" --emptyOutDir)
git worktree add --detach /tmp/sl5-v1 "$V1_SHA"
(cd /tmp/sl5-v1/app && npm ci && npx vite build --base /sl5/v1/ --outDir "$REPO/dist/v1" --emptyOutDir)
git worktree remove --force /tmp/sl5-v1
cp site/index.html dist/ && mkdir -p dist/intro dist/thumbs
cp site/intro/index.html dist/intro/ && cp site/thumbs/*.webp dist/thumbs/

mkdir -p /tmp/pages && ln -sfn "$REPO/dist" /tmp/pages/sl5
python3 -m http.server 8000 -d /tmp/pages   # open http://localhost:8000/sl5/
```

## Moving v1

Don't. `/sl5/v1/` exists so old Share links keep opening the posture they were
made with. Changing `V1_SHA` changes what those links open.
