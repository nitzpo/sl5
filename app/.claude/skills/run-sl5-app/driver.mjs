#!/usr/bin/env node
// Headless driver for the SL5 explorable (v2).
//
// `chromium-cli` is NOT available in this container, so this script is the
// harness: it drives the real app in headless Chromium via Playwright and
// asserts the things that unit tests structurally cannot reach — real layout
// (the matrix's measured path overlay, the clusters' fit), the drawers, story
// playback end to end, dark mode, the desktop gate, and the intro page.
//
// Playwright is deliberately NOT a project dependency: it pulls a ~100MB browser
// download that every `npm install` and the Pages deploy would pay for, to run a
// driver most contributors never invoke. Install it wherever you like and point
// this script at it with PLAYWRIGHT_DIR (see SKILL.md).
//
// Usage:  node .claude/skills/run-sl5-app/driver.mjs [flow] [--url=...] [--out=...] [--headed]
//
//   flows: smoke (default) | views | interact | story | dark | gate | intro | all
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
// the DesktopGate instead of the app. 1600x1000 is the design size.
const WIDE = { width: 1600, height: 1000 };
const NARROW = { width: 500, height: 900 };

// The app root, derived from this script's own location
// (app/.claude/skills/run-sl5-app/ → up 3). Never a hard-coded absolute path:
// the driver has to work in any clone, not just the machine it was written on.
const APP_ROOT = dirname(dirname(dirname(import.meta.dirname)));

/** Today's catalogue, read from the same JSON the app loads, so a missing
 * tile fails rather than squeaking by. */
const CATALOGUE = (() => {
  const dir = join(APP_ROOT, "public", "data");
  const today = [];
  for (const f of readdirSync(dir)) {
    if (!f.startsWith("blocks-") || !f.endsWith(".json")) continue;
    for (const b of JSON.parse(readFileSync(join(dir, f), "utf-8"))) today.push(b.id);
  }
  return { today: today.sort() };
})();

/** The intro's slide order, read from its source so the deep-link check
 * follows the intro as it changes. */
const SLIDES = (() => {
  try {
    const src = readFileSync(join(APP_ROOT, "src", "intro", "slides", "index.ts"), "utf-8");
    return [...src.matchAll(/slug:\s*"([^"]+)",\s*\n?\s*title:\s*"([^"]+)"/g)].map((m) => ({ slug: m[1], title: m[2] }));
  } catch {
    return [];
  }
})();

const FLOW_NAMES = ["smoke", "views", "interact", "story", "dark", "gate", "intro"];
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
async function newPage(viewport = WIDE, colorScheme = "light") {
  const ctx = await browser.newContext({ viewport, colorScheme });
  const page = await ctx.newPage();
  page.errors = [];
  page.on("console", (m) => m.type() === "error" && page.errors.push(m.text()));
  page.on("pageerror", (e) => page.errors.push(`pageerror: ${e.message}`));
  page.closeAll = () => ctx.close();
  return page;
}

/**
 * Open the app and get past the first-run modal (a fresh context has no
 * `sl5v2_intro_seen`, so it always shows). "Explore freely" is its quiet exit;
 * Escape is the fallback if that label ever changes.
 */
async function openApp(page) {
  await page.goto(APP, { waitUntil: "domcontentloaded" });
  await page.locator("[data-block-id]").first().waitFor({ timeout: 20000 });
  const modal = page.locator('[data-testid="intro-overlay"]');
  if (await modal.count()) {
    const quiet = page.getByRole("button", { name: /Explore freely/i });
    if (await quiet.count()) await quiet.click();
    else await page.keyboard.press("Escape");
    await modal.waitFor({ state: "detached", timeout: 5000 });
  }
  // The matrix measures its tiles after layout; let fonts and that pass settle.
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(250);
}

const shownIds = (page) =>
  page.evaluate(() => [...document.querySelectorAll("[data-block-id]")].map((el) => el.dataset.blockId).sort());
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

/** Visible text and hover text of the main screen, minus quoted research prose. */
const readerText = (page) =>
  page.evaluate(() => {
    const clone = document.body.cloneNode(true);
    clone.querySelectorAll("[data-prose], script, style").forEach((el) => el.remove());
    const attrs = [...clone.querySelectorAll("*")].flatMap((el) =>
      ["title", "aria-label", "aria-valuetext"].map((a) => el.getAttribute(a) ?? "")
    );
    return [clone.innerText ?? clone.textContent, ...attrs].join("\n");
  });

/** Text under 12px anywhere on screen (the type scale's floor). */
const tinyText = (page) =>
  page.evaluate(() => {
    const out = [];
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) {
      const node = walk.currentNode;
      if (!node.textContent.trim()) continue;
      const el = node.parentElement;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none") continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      let size = parseFloat(cs.fontSize);
      // SVG text scales with its viewBox: measure what is actually drawn.
      const svg = el.closest("svg");
      if (svg && svg.viewBox?.baseVal?.width) {
        const vb = svg.viewBox.baseVal;
        const box = svg.getBoundingClientRect();
        size *= Math.min(box.width / vb.width, box.height / vb.height);
      }
      if (size < 11.95) out.push(`${node.textContent.trim().slice(0, 24)} (${size.toFixed(1)}px)`);
    }
    return out;
  });

// ---------------------------------------------------------------- flows

/** Loads, renders the whole catalogue and a verdict, no console errors. */
async function smoke() {
  console.log("\n[smoke] app loads, renders the catalogue and the verdict");
  const page = await newPage();
  await openApp(page);
  const ids = await shownIds(page);
  check("every block in today's catalogue rendered, once", same(ids, CATALOGUE.today), `${ids.length} tiles, expected ${CATALOGUE.today.length}`);
  const sl = await page.locator('[data-testid="sl-level"]').innerText();
  check("the rail states a level", /^SL[0-5]$/.test(sl.replace(/\s+/g, "")), sl);
  const ladder = await page.locator('[data-testid="tier-ladder"]').innerText();
  check("the tier ladder speaks in band words", /usually fails|contested|usually succeeds/.test(ladder));
  const paths = await page.evaluate(() => document.querySelectorAll('svg rect[fill="var(--signal)"]').length);
  check("the easiest path is drawn on the matrix", paths > 3, `${paths} path segments`);
  const text = await readerText(page);
  check("no percentage anywhere on screen", !/%/.test(text), (text.match(/.{0,30}%.{0,10}/) ?? [""])[0]);
  const tiny = await tinyText(page);
  check("nothing set below 12px", tiny.length === 0, tiny.slice(0, 5).join(", ") || "all ≥ 12px");
  check("no console errors", page.errors.length === 0, page.errors.join(" | ") || "clean");
  await page.screenshot({ path: `${OUT}/smoke.png` });
  console.log(`  screenshot → ${OUT}/smoke.png`);
  await page.closeAll();
}

/** The catalogue's two layouts and the two other screens each mount and lay out. */
async function views() {
  console.log("\n[views] stage matrix, clusters, approaches, race");
  const page = await newPage();
  await openApp(page);
  await page.screenshot({ path: `${OUT}/view-matrix.png` });
  check("matrix renders", same(await shownIds(page), CATALOGUE.today));

  await page.getByRole("radio", { name: "Clusters" }).click();
  await page.locator("svg [data-block-id]").first().waitFor();
  const hexes = await shownIds(page);
  const fit = await page.evaluate(() => {
    const svg = document.querySelector('svg[aria-label^="Defense catalogue"]');
    const b = svg.getBoundingClientRect();
    return { w: Math.round(b.width), h: Math.round(b.height) };
  });
  check("clusters render every block as a hexagon", same(hexes, CATALOGUE.today), `${hexes.length} hexes, ${fit.w}×${fit.h}px`);
  await page.screenshot({ path: `${OUT}/view-clusters.png` });

  await page.getByRole("tab", { name: "Approaches", exact: true }).click();
  await page.locator('[data-testid="approaches-view"]').waitFor();
  const lanes = await page.locator("[data-approach]").count();
  check("approaches: one lane per approach", lanes >= 5, `${lanes} lanes`);
  await page.screenshot({ path: `${OUT}/view-approaches.png` });

  await page.getByRole("tab", { name: "Race", exact: true }).click();
  await page.locator('[data-testid="race-view"]').waitFor();
  await page.waitForTimeout(400); // the strip is computed from a deferred value
  const bars = await page.locator('[data-testid="race-view"] svg g title').count();
  check("race: long-lead bars against the threat front", bars > 0, `${bars} bars`);
  await page.screenshot({ path: `${OUT}/view-race.png` });
  const tiny = await tinyText(page);
  check("nothing set below 12px on the race", tiny.length === 0, tiny.slice(0, 5).join(", ") || "all ≥ 12px");
  check("no console errors", page.errors.length === 0, page.errors.join(" | ") || "clean");
  console.log(`  screenshots → ${OUT}/view-*.png`);
  await page.closeAll();
}

/** Click advances, right-click steps back, Shift-click opens the drawer, the
 * parameters drawer opens, and its scoring method switches the rail. */
async function interact() {
  console.log("\n[interact] blocks, drawers, toggles");
  const page = await newPage();
  await openApp(page);
  const tile = page.locator('[data-block-id="PER-04"] button').first();
  const label = () => tile.getAttribute("aria-label");
  const before = await label();
  await tile.click();
  const after = await label();
  check("click advances a block", before !== after, `${before?.split(".")[1]?.trim()} → ${after?.split(".")[1]?.trim()}`);
  await tile.click({ button: "right" });
  check("right-click steps it back", (await label()) === before);

  await page.locator('[data-block-id="NET-01"] button').first().click({ modifiers: ["Shift"] });
  const drawer = page.locator('[data-testid="block-drawer"]');
  await drawer.waitFor({ timeout: 5000 });
  const dtext = await drawer.innerText();
  check("Shift-click opens the block drawer", /Air gap/.test(dtext) && /Counters/i.test(dtext));
  await page.screenshot({ path: `${OUT}/drawer.png` });
  await page.keyboard.press("Escape");
  await drawer.waitFor({ state: "detached", timeout: 3000 });
  check("Escape closes it", true);

  await page.getByRole("button", { name: "Parameters" }).click();
  const params = page.locator('[data-testid="parameters-drawer"]');
  await params.waitFor({ timeout: 3000 });
  const ptext = await params.innerText();
  check(
    "parameters: scoring method, strictness, propensity, serving, government",
    /How to score your security level/i.test(ptext) && /Strict/.test(ptext) && /AI propensity/.test(ptext) && /Model served/.test(ptext) && /Government partnership/.test(ptext)
  );
  await page.screenshot({ path: `${OUT}/parameters.png` });
  const rail = page.locator('[data-testid="verdict-rail"]');
  await params.getByRole("radio", { name: /Control coverage/ }).click();
  await page.waitForTimeout(300);
  const coverageSl = (await page.locator('[data-testid="sl-level"]').innerText()).replace(/\s+/g, "");
  check(
    "scoring method → control coverage switches the rail",
    (await rail.getAttribute("data-scoring-mode")) === "coverage" && /^SL[0-5]$/.test(coverageSl) && (await page.locator('[data-testid="coverage-list"]').count()) === 1,
    coverageSl
  );
  await params.getByRole("radio", { name: /Attack-path analysis/ }).click();
  await page.waitForTimeout(300);
  check("and back to attack paths", (await rail.getAttribute("data-scoring-mode")) === "paths" && (await page.locator('[data-testid="tier-ladder"]').count()) === 1);
  check("no console errors", page.errors.length === 0, page.errors.join(" | ") || "clean");
  console.log(`  screenshots → ${OUT}/{drawer,parameters}.png`);
  await page.closeAll();
}

/** A 1-minute story plays with the new verdict, ends with a takeaway, and
 * stopping it restores the reader's posture. */
async function story() {
  console.log("\n[story] scenario playback");
  const page = await newPage();
  await openApp(page);
  const yearBefore = await page.locator("header").getByLabel(/^Year \d/).first().innerText();
  await page.getByRole("button", { name: /Scenarios/ }).click();
  await page.getByRole("menuitem", { name: /Proactive Program/ }).click();
  await page.locator('[data-testid="playback-bar"]').waitFor({ timeout: 5000 });
  check("story starts with the transport and a caption in the rail", (await page.locator('[data-testid="story-caption"]').count()) === 1);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/story-playing.png` });
  await page.getByRole("button", { name: "Pause" }).click();
  const track = page.locator('[data-testid="playback-bar"] [role="slider"]');
  const box = await track.boundingBox();
  await page.mouse.click(box.x + box.width - 1, box.y + box.height / 2);
  await page.waitForTimeout(600);
  const caption = await page.locator('[data-testid="story-caption"]').innerText();
  check("the end shows a takeaway with the level", /SL\d/.test(caption) && /Replay/.test(caption), caption.split("\n").slice(1, 2).join(" "));
  const sl = await page.locator('[data-testid="sl-level"]').innerText();
  check("Proactive Program reaches SL5 by 2030", sl.replace(/\s+/g, "") === "SL5", sl);
  await page.screenshot({ path: `${OUT}/story-end.png` });
  await page.getByRole("button", { name: /Stop the story/ }).click();
  await page.locator('[data-testid="playback-bar"]').waitFor({ state: "detached", timeout: 3000 });
  const yearAfter = await page.locator("header").getByLabel(/^Year \d/).first().innerText();
  check("stopping restores the reader's year", yearAfter === yearBefore, `${yearBefore} → ${yearAfter}`);
  check("no console errors", page.errors.length === 0, page.errors.join(" | ") || "clean");
  console.log(`  screenshots → ${OUT}/story-{playing,end}.png`);
  await page.closeAll();
}

/** prefers-color-scheme: dark gets the dark palette. */
async function dark() {
  console.log("\n[dark] dark palette");
  const page = await newPage(WIDE, "dark");
  await openApp(page);
  const bg = await page.evaluate(() => getComputedStyle(document.querySelector(".sl5")).backgroundColor);
  const lum = (bg.match(/\d+/g) ?? []).slice(0, 3).map(Number).reduce((a, b) => a + b, 0) / 3;
  check("the app paints a dark paper", lum < 60, bg);
  await page.screenshot({ path: `${OUT}/dark-matrix.png` });
  await page.getByRole("radio", { name: "Clusters" }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/dark-clusters.png` });
  check("no console errors", page.errors.length === 0, page.errors.join(" | ") || "clean");
  console.log(`  screenshots → ${OUT}/dark-*.png`);
  await page.closeAll();
}

/**
 * The gate must render INSTEAD of the app, not over it. The whole point is that
 * App never mounts on a narrow viewport — so assert the absence of the
 * catalogue, not just the presence of the gate text.
 */
async function gate() {
  console.log("\n[gate] desktop gate replaces the app below 768px");
  const page = await newPage(NARROW);
  await page.goto(APP, { waitUntil: "domcontentloaded" });
  await page.locator("text=Desktop required").waitFor({ timeout: 15000 });
  check("gate shown at 500px", true, "'Desktop required' present");
  check("app never mounted", (await page.locator("[data-block-id], header").count()) === 0, "no catalogue behind the gate");
  check("intro link offered", (await page.locator("a[href*='intro']").count()) > 0, "phone-readable escape hatch");
  await page.screenshot({ path: `${OUT}/gate.png` });

  // matchMedia subscription: the gate must react to a live resize both ways.
  await page.setViewportSize(WIDE);
  await page.locator("[data-block-id]").first().waitFor({ timeout: 15000 });
  check("widening mounts the app", true, "500 → 1600px");
  await page.setViewportSize(NARROW);
  await page.locator("text=Desktop required").waitFor({ timeout: 10000 });
  check("narrowing restores the gate", true, "1600 → 500px");
  check("no console errors", page.errors.length === 0, page.errors.join(" | ") || "clean");
  console.log(`  screenshot → ${OUT}/gate.png`);
  await page.closeAll();
}

/** The second Vite entry point. Unlike the app, it is phone-readable. */
async function intro() {
  console.log("\n[intro] standalone introduction page");
  const page = await newPage();
  await page.goto(INTRO, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { level: 1 }).first().waitFor({ timeout: 15000 });
  const text = await page.locator("body").innerText();
  check("intro renders content", text.trim().length > 200, `${text.trim().length} chars of copy`);
  check("no console errors", page.errors.length === 0, page.errors.join(" | ") || "clean");
  await page.screenshot({ path: `${OUT}/intro.png` });

  // Deep links: every slide is addressable by hash. The expected slide comes
  // from the intro's own slide list, so this follows it as it changes.
  const n = SLIDES.findIndex((s) => s.slug === "the-oc-ladder");
  const target = n >= 0 ? { ...SLIDES[n], n: n + 1 } : SLIDES.length > 2 ? { ...SLIDES[2], n: 3 } : null;
  if (!target) {
    check("intro slide list readable", false, "src/intro/slides/index.ts");
  } else {
    await page.goto(`${INTRO}#${target.slug}`, { waitUntil: "domcontentloaded" });
    const landed = await page
      .getByText(target.title, { exact: false })
      .first()
      .waitFor({ timeout: 10000 })
      .then(() => true)
      .catch(() => false);
    check("hash deep-link lands on the right slide", landed, `#${target.slug} → "${target.title}"`);
    const counterText = await page
      .locator("header span")
      .filter({ hasText: /^\d+\/\d+$/ })
      .first()
      .innerText()
      .catch(() => null);
    const counter = counterText?.match(/^(\d+)\/(\d+)$/);
    check(
      "deep-linked slide is at the right position",
      !counter || Number(counter[1]) === target.n,
      counter ? `counter reads ${counter[0]}, expected ${target.n}/${counter[2]}` : "no N/M counter shown"
    );
    await page.screenshot({ path: `${OUT}/intro-deeplink.png` });
  }

  // Phone width: the intro must not be gated (only the app is desktop-only) AND
  // must actually fit.
  const phone = await newPage({ width: 390, height: 844 });
  await phone.goto(INTRO, { waitUntil: "domcontentloaded" });
  await phone.getByRole("heading", { level: 1 }).first().waitFor({ timeout: 15000 });
  check("intro is not desktop-gated", !(await phone.locator("text=Desktop required").count()), "no gate at 390px");
  const overflow = await phone.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: window.innerWidth }));
  check("no horizontal overflow at 390px", overflow.doc <= overflow.win + 1, `scrollWidth ${overflow.doc} vs viewport ${overflow.win}`);
  await phone.screenshot({ path: `${OUT}/intro-phone.png` });
  console.log(`  screenshots → ${OUT}/intro{,-deeplink,-phone}.png`);
  await phone.closeAll();
  await page.closeAll();
}

const flows = { smoke, views, interact, story, dark, gate, intro };

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
console.log(failures ? `\n${failures} check(s) FAILED in ${secs}s` : `\nall checks passed in ${secs}s`);
process.exit(failures ? 1 : 0);
