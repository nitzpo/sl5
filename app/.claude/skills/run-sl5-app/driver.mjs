#!/usr/bin/env node
// Headless driver for the SL5 explorable.
//
// `chromium-cli` is NOT available in this container, so this script is the
// harness: it drives the real app in headless Chromium via Playwright and
// asserts the things that unit tests structurally cannot reach — the pan/zoom
// transform the hook actually emits, the desktop gate, and the intro page.
//
// Playwright is deliberately NOT a project dependency: it pulls a ~100MB browser
// download that every `npm install` and the Pages deploy would pay for, to run a
// driver most contributors never invoke. Install it wherever you like and point
// this script at it with PLAYWRIGHT_DIR (see SKILL.md).
//
// Usage:  node .claude/skills/run-sl5-app/driver.mjs [flow] [--url=...] [--out=...] [--headed]
//
//   flows: smoke (default) | panzoom | gate | intro | views | all
//
// Exit code is nonzero if any assertion fails, so it works in a pipeline.

import { mkdirSync, readdirSync, readFileSync } from "fs";
import { createRequire } from "module";
import { dirname, join } from "path";

/** Keep in step with SKILL.md's install command. */
const PINNED_PLAYWRIGHT = "1.62.0";

// Resolve playwright from PLAYWRIGHT_DIR, then from the app, then from the
// ambient install. NODE_PATH does NOT work here — Node ignores it for ESM
// `import`, so a bare `import "playwright"` fails even with NODE_PATH set.
// createRequire against an explicit directory is the resolution that does work.
const chromium = await (async () => {
  const roots = [process.env.PLAYWRIGHT_DIR, import.meta.dirname, process.cwd()].filter(Boolean);
  for (const root of roots) {
    try {
      const req = createRequire(`${root.replace(/\/$/, "")}/package.json`);
      return req("playwright").chromium;
    } catch {
      /* try the next root */
    }
  }
  try {
    return (await import("playwright")).chromium;
  } catch {
    // Pinned to match SKILL.md — an unpinned recovery hint would send anyone who
    // hits this error to a moving version, defeating the point of pinning.
    console.error(
      "playwright not found. Install it and re-run, e.g.:\n" +
        `  mkdir -p /tmp/pw && cd /tmp/pw && npm init -y && npm i playwright@${PINNED_PLAYWRIGHT}\n` +
        `  npx playwright@${PINNED_PLAYWRIGHT} install chromium\n` +
        "  PLAYWRIGHT_DIR=/tmp/pw node .claude/skills/run-sl5-app/driver.mjs all"
    );
    process.exit(2);
  }
})();

const args = process.argv.slice(2);
const flow = args.find((a) => !a.startsWith("-")) ?? "smoke";
const arg = (n, d) => {
  const hit = args.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : d;
};

const BASE = arg("url", "http://localhost:5173").replace(/\/$/, "");
const APP = `${BASE}/sl5/`;
const INTRO = `${BASE}/sl5/intro/`;
const OUT = arg("out", "/tmp/sl5-shots");
// The app hard-gates below 768px (Tailwind `md`), so anything narrower renders
// the DesktopGate instead of the map. 1600x1000 is comfortably above it.
const WIDE = { width: 1600, height: 1000 };
const NARROW = { width: 500, height: 900 };

// The app root, derived from this script's own location
// (app/.claude/skills/run-sl5-app/ → up 3). Never a hard-coded absolute path:
// the driver has to work in any clone, not just the machine it was written on.
const APP_ROOT = dirname(dirname(dirname(import.meta.dirname)));

/** How many blocks the catalog actually declares, read from the same JSON the app loads. */
const EXPECTED_BLOCKS = (() => {
  const dir = join(APP_ROOT, "public", "data");
  let n = 0;
  for (const f of readdirSync(dir)) {
    if (f.startsWith("blocks-") && f.endsWith(".json"))
      n += JSON.parse(readFileSync(join(dir, f), "utf-8")).length;
  }
  return n;
})();

const FLOW_NAMES = ["smoke", "panzoom", "gate", "intro", "views"];
// Validated before launching a browser, so a typo fails instantly.
const toRun = flow === "all" ? FLOW_NAMES : [flow];
if (!toRun.every((f) => FLOW_NAMES.includes(f))) {
  console.error(`unknown flow "${flow}" — expected one of: ${FLOW_NAMES.join(", ")}, all`);
  process.exit(2);
}

mkdirSync(OUT, { recursive: true });

let failures = 0;
const check = (label, pass, detail = "") => {
  console.log(`${pass ? "  ok  " : "  FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!pass) failures++;
};

const browser = await chromium.launch({
  headless: !args.includes("--headed"),
  args: ["--no-sandbox"],
});

/** A page that collects console errors, so a green flow can't hide a throw. */
async function newPage(viewport = WIDE) {
  const page = await browser.newPage({ viewport });
  page.errors = [];
  page.on("console", (m) => m.type() === "error" && page.errors.push(m.text()));
  page.on("pageerror", (e) => page.errors.push(`pageerror: ${e.message}`));
  return page;
}

/**
 * Open the app and get past the first-run modal.
 *
 * The modal is not dismissible by Escape alone and it overlays the canvas, so
 * hexes are unclickable until it is gone. Its CTA text has changed across
 * recent commits (#17/#18 reworked it), so match a list of candidates rather
 * than one brittle label.
 */
async function openApp(page) {
  await page.goto(APP, { waitUntil: "domcontentloaded" });
  await page.locator("svg.touch-none").first().waitFor({ timeout: 20000 });
  for (const re of [/^Explore/i, /Skip/i, /Got it/i, /^Start/i, /Close/i]) {
    const b = page.locator("button", { hasText: re }).first();
    if ((await b.count()) && (await b.isVisible().catch(() => false))) {
      await b.click().catch(() => {});
      break;
    }
  }
  await page.keyboard.press("Escape").catch(() => {});
  // The map fades/settles after the modal closes; wait for the transform group
  // to be visible rather than sleeping a fixed amount.
  await page
    .locator("svg.touch-none g[transform]")
    .first()
    .waitFor({ state: "visible", timeout: 10000 });
  await settled(page);
}

/**
 * Wait until the pan/zoom transform stops changing.
 *
 * Panel widths are animated, so reading the transform too early catches an
 * intermediate `tx`. Polling for two identical consecutive samples finishes as
 * soon as the animation actually ends — typically well under a fixed sleep, and
 * it can't under-wait on a slow machine either.
 */
async function settled(page, { interval = 100, timeout = 4000 } = {}) {
  const read = () =>
    page
      .locator("svg.touch-none g[transform]")
      .first()
      .getAttribute("transform")
      .catch(() => null);
  let prev = await read();
  for (let waited = 0; waited < timeout; waited += interval) {
    await page.waitForTimeout(interval);
    const now = await read();
    if (now && now === prev) return;
    prev = now;
  }
}

/** The transform `<g>` is the direct output of use-viewbox-pan-zoom. */
const readTransform = (page) =>
  page.evaluate(() => {
    const svg = document.querySelector("svg.touch-none");
    const g = svg?.querySelector("g[transform]");
    const box = svg?.getBoundingClientRect();
    return {
      transform: g?.getAttribute("transform") ?? null,
      visibility: g?.getAttribute("visibility") ?? "visible",
      svgW: Math.round(box?.width ?? 0),
      svgH: Math.round(box?.height ?? 0),
    };
  });

const parse = (t) => {
  const m = /translate\(([-\d.eE]+) ([-\d.eE]+)\) scale\(([-\d.eE]+)\)/.exec(t || "");
  return m ? { tx: +m[1], ty: +m[2], k: +m[3] } : null;
};

// ---------------------------------------------------------------- flows

/** Loads, renders the catalog, no console errors. The cheapest "is it alive". */
async function smoke() {
  console.log("\n[smoke] app loads and renders the block catalog");
  const page = await newPage();
  await openApp(page);
  const hexes = await page.locator("svg g.cursor-pointer").count();
  const t = await readTransform(page);
  // Exact, not `> 40`: the catalog is 47 blocks (counted from public/data at
  // startup), so a missing entry must fail rather than squeak by.
  check(
    "every block hex rendered",
    hexes === EXPECTED_BLOCKS,
    `${hexes} interactive groups, expected ${EXPECTED_BLOCKS}`
  );
  check("transform group visible", t.visibility !== "hidden", t.transform ?? "no transform");
  check("no console errors", page.errors.length === 0, page.errors.join(" | ") || "clean");
  await page.screenshot({ path: `${OUT}/smoke.png` });
  console.log(`  screenshot → ${OUT}/smoke.png`);
  await page.close();
}

/**
 * The invariant the pan/zoom hook exists to hold, and the one with NO unit-test
 * coverage: opening a side panel must PAN the map, never rescale it.
 *
 * tests/utils/pan-zoom.test.ts only covers the exported pure `recenterOnResize`.
 * Everything about the render path — the latch, the baseline fit, the ref sync —
 * is only observable here, in a real browser with real layout.
 */
async function panzoom() {
  console.log("\n[panzoom] panel open pans without rescaling");
  const page = await newPage();
  await openApp(page);

  const centering = await page.evaluate(() => {
    const svg = document.querySelector("svg.touch-none");
    const g = svg.querySelector("g[transform]");
    const s = svg.getBoundingClientRect();
    const b = g.getBoundingClientRect();
    return {
      dx: Math.round(b.x + b.width / 2 - (s.x + s.width / 2)),
      dy: Math.round(b.y + b.height / 2 - (s.y + s.height / 2)),
    };
  });
  check(
    "content centered on load",
    Math.abs(centering.dx) <= 2 && Math.abs(centering.dy) <= 2,
    `offset ${centering.dx},${centering.dy}px from viewport center`
  );

  const before = await readTransform(page);
  await page.screenshot({ path: `${OUT}/panzoom-before.png` });

  await page.locator("svg g.cursor-pointer").first().click();
  await page.locator("text=Block Detail").first().waitFor({ timeout: 8000 });
  await settled(page); // the panel width is animated; read tx only once it stops
  const after = await readTransform(page);
  await page.screenshot({ path: `${OUT}/panzoom-after.png` });

  const b = parse(before.transform);
  const a = parse(after.transform);
  if (!b || !a) {
    check("transforms parse", false, `${before.transform} -> ${after.transform}`);
  } else {
    const expectedTx = b.tx + (after.svgW - before.svgW) / 2;
    check("canvas actually narrowed", after.svgW < before.svgW, `${before.svgW} → ${after.svgW}px`);
    check("scale held (no rescale)", Math.abs(a.k - b.k) < 1e-9, `k ${b.k} → ${a.k}`);
    check("vertical offset unchanged", Math.abs(a.ty - b.ty) < 1e-6, `ty ${b.ty} → ${a.ty}`);
    check(
      "panned by exactly half the width change",
      Math.abs(a.tx - expectedTx) < 2,
      `tx ${b.tx.toFixed(2)} → ${a.tx.toFixed(2)}, expected ${expectedTx.toFixed(2)}`
    );
  }
  check("no console errors", page.errors.length === 0, page.errors.join(" | ") || "clean");
  console.log(`  screenshots → ${OUT}/panzoom-{before,after}.png`);
  await page.close();
}

/**
 * The gate must render INSTEAD of the app, not over it. The whole point is that
 * App never mounts on a narrow viewport — so assert the absence of the map's
 * <svg>, not just the presence of the gate text.
 */
async function gate() {
  console.log("\n[gate] desktop gate replaces the app below 768px");
  const page = await newPage(NARROW);
  await page.goto(APP, { waitUntil: "domcontentloaded" });
  await page.locator("text=Desktop required").waitFor({ timeout: 15000 });
  check("gate shown at 500px", true, "'Desktop required' present");
  check(
    "app SVG never mounted",
    (await page.locator("svg.touch-none").count()) === 0,
    "no pan/zoom canvas behind the gate"
  );
  check(
    "intro link offered",
    (await page.locator("a[href*='intro']").count()) > 0,
    "phone-readable escape hatch"
  );
  await page.screenshot({ path: `${OUT}/gate.png` });

  // matchMedia subscription: the gate must react to a live resize both ways.
  await page.setViewportSize(WIDE);
  await page.locator("svg.touch-none").first().waitFor({ timeout: 15000 });
  check("widening mounts the app", true, "500 → 1600px");
  await page.setViewportSize(NARROW);
  await page.locator("text=Desktop required").waitFor({ timeout: 10000 });
  check("narrowing restores the gate", true, "1600 → 500px");
  check("no console errors", page.errors.length === 0, page.errors.join(" | ") || "clean");
  console.log(`  screenshot → ${OUT}/gate.png`);
  await page.close();
}

/** The second Vite entry point. Unlike the app, it is phone-readable. */
async function intro() {
  console.log("\n[intro] standalone introduction page");
  // Slide 5 of 13 in src/intro/slides/index.ts. Asserting the TITLE and the
  // counter (not just "the page has text") is what makes this prove the hash
  // was honored — a deep link that silently fell back to slide 1 would pass a
  // mere length check.
  const OC = { slug: "the-oc-ladder", title: "How capable is the attacker?", n: 5 };

  const page = await newPage();
  await page.goto(INTRO, { waitUntil: "domcontentloaded" });
  // Wait on the first slide's real heading rather than a fixed sleep.
  await page.getByRole("heading", { level: 1 }).first().waitFor({ timeout: 15000 });
  const text = await page.locator("body").innerText();
  check("intro renders content", text.trim().length > 200, `${text.trim().length} chars of copy`);
  check("no console errors", page.errors.length === 0, page.errors.join(" | ") || "clean");
  await page.screenshot({ path: `${OUT}/intro.png` });

  // Deep links are a documented feature: every slide is addressable by hash.
  await page.goto(`${INTRO}#${OC.slug}`, { waitUntil: "domcontentloaded" });
  const ocTitle = page.getByText(OC.title, { exact: false }).first();
  const landed = await ocTitle
    .waitFor({ timeout: 10000 })
    .then(() => true)
    .catch(() => false);
  check("hash deep-link lands on the right slide", landed, `#${OC.slug} → "${OC.title}"`);
  // Scoped to the <header> and matched on the element's WHOLE text. The counter
  // is an unlabeled span, and slide bodies are full of other `N/M` strings
  // (ratios like 900/40, and a literal 1/2 in slide-parts.tsx), so regexing
  // body.innerText would match whichever happened to come first.
  const counterText = await page
    .locator("header span")
    .filter({ hasText: /^\d+\/\d+$/ })
    .first()
    .innerText()
    .catch(() => null);
  const counter = counterText?.match(/^(\d+)\/(\d+)$/);
  check(
    "deep-linked slide is at the right position",
    !!counter && Number(counter[1]) === OC.n,
    counter ? `counter reads ${counter[0]}, expected ${OC.n}/${counter[2]}` : "no N/M counter found"
  );
  await page.screenshot({ path: `${OUT}/intro-oc-ladder.png` });

  // Phone width: the intro must not be gated (only the app is desktop-only) AND
  // must actually fit — "no gate" alone said nothing about readability.
  const phone = await newPage({ width: 390, height: 844 });
  await phone.goto(INTRO, { waitUntil: "domcontentloaded" });
  await phone.getByRole("heading", { level: 1 }).first().waitFor({ timeout: 15000 });
  check(
    "intro is not desktop-gated",
    !(await phone.locator("text=Desktop required").count()),
    "no gate at 390px"
  );
  const overflow = await phone.evaluate(() => ({
    doc: document.documentElement.scrollWidth,
    win: window.innerWidth,
  }));
  // The page body must not scroll sideways. 1px of slack for sub-pixel layout.
  check(
    "no horizontal overflow at 390px",
    overflow.doc <= overflow.win + 1,
    `scrollWidth ${overflow.doc} vs viewport ${overflow.win}`
  );
  await phone.screenshot({ path: `${OUT}/intro-phone.png` });
  console.log(`  screenshots → ${OUT}/intro{,-oc-ladder,-phone}.png`);
  await phone.close();
  await page.close();
}

/** Clusters / Grid / Rings each mount a fresh <svg>; switching resets the view. */
async function views() {
  console.log("\n[views] all three canvas views mount");
  const page = await newPage();
  await openApp(page);
  for (const name of ["Clusters", "Grid", "Rings"]) {
    const btn = page.locator("button", { hasText: new RegExp(`^${name}$`) }).first();
    if (!(await btn.count())) {
      check(`${name} button present`, false, "not found");
      continue;
    }
    await btn.click();
    await settled(page);
    const t = await readTransform(page);
    const hexes = await page.locator("svg g.cursor-pointer").count();
    check(
      `${name} view renders`,
      !!parse(t.transform) && hexes > 0 && t.visibility !== "hidden",
      `${hexes} hexes, ${t.transform}`
    );
    await page.screenshot({ path: `${OUT}/view-${name.toLowerCase()}.png` });
  }
  check("no console errors", page.errors.length === 0, page.errors.join(" | ") || "clean");
  console.log(`  screenshots → ${OUT}/view-*.png`);
  await page.close();
}

const flows = { smoke, panzoom, gate, intro, views };

console.log(`driving ${APP}  (flows: ${toRun.join(", ")})`);
const started = Date.now();
// The flow actually executing, not `flow` (the CLI selector — which is "all" for
// a full run and would lose the attribution).
let currentFlow = toRun[0];
try {
  for (const f of toRun) {
    currentFlow = f;
    await flows[f]();
  }
} catch (err) {
  // A timeout or a failed click lands here. Report it as a failure rather than
  // an unhandled rejection, so the exit code still means something.
  console.error(`\n  FAIL ${currentFlow} threw — ${err.message.split("\n")[0]}`);
  failures++;
} finally {
  // Always: an aborted flow used to leave a headless Chromium running.
  await browser.close();
}

const secs = ((Date.now() - started) / 1000).toFixed(1);
console.log(
  failures ? `\n${failures} check(s) FAILED in ${secs}s` : `\nall checks passed in ${secs}s`
);
process.exit(failures ? 1 : 0);
