#!/usr/bin/env node
// Regenerates the version-picker thumbnails, site/thumbs/v1.webp and v2.webp,
// from real builds of each version. See site/README.md.
//
//   node site/capture-thumbnails.mjs                       build both, capture both
//   node site/capture-thumbnails.mjs --only v2             one version (v1 is frozen,
//                                                          so its thumbnail rarely changes)
//   node site/capture-thumbnails.mjs --dist dist           capture an already assembled
//                                                          dist/ (dist/v1, dist/v2), no build
//   node site/capture-thumbnails.mjs --image v2=mock.jpg   use an image instead of a capture
//
// How a capture is made: each build is served locally under /sl5/ (the same
// paths as GitHub Pages), opened in headless Chromium at 1600x1000 and device
// scale factor 1, the first-run modal is dismissed, and the main screen is
// screenshotted. The browser then downsizes it to 1200x750 and encodes WebP, so
// no image library is needed beyond Playwright itself.
//
// Builds: v2 is the working tree's app/ (needs `npm ci` in app/ first). v1 is
// the commit pinned as V1_SHA in .github/workflows/deploy.yml, checked out in a
// temporary git worktree with its own `npm ci`, exactly as the deploy does.

import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = dirname(fileURLToPath(import.meta.url));
const REPO = dirname(SITE);
const VERSIONS = ["v1", "v2"];
const VIEWPORT = { width: 1600, height: 1000 };
const THUMB = { width: 1200, height: 750 };
const QUALITY = 0.82;

// ---- arguments ----
const args = process.argv.slice(2);
const opt = { only: VERSIONS, dist: null, out: join(SITE, "thumbs"), images: {} };
for (let i = 0; i < args.length; i++) {
  // Both `--flag value` and `--flag=value`.
  const [flag, inline] = args[i].split(/=(.*)/s);
  const val = () => inline ?? args[++i] ?? fail(`${flag} needs a value`);
  if (flag === "--only") opt.only = val().split(",").map((s) => s.trim());
  else if (flag === "--dist") opt.dist = resolve(val());
  else if (flag === "--out") opt.out = resolve(val());
  else if (flag === "--image") {
    const m = /^(v\d+)=(.+)$/.exec(val());
    if (!m) fail("--image takes vN=<path>, e.g. --image v2=mockup.jpg");
    opt.images[m[1]] = resolve(m[2]);
  } else if (flag === "-h" || flag === "--help") {
    console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1, 11).map((l) => l.replace(/^\/\/ ?/, "")).join("\n"));
    process.exit(0);
  } else fail(`unknown argument ${args[i]}`);
}
for (const v of opt.only) if (!VERSIONS.includes(v)) fail(`unknown version ${v} (expected ${VERSIONS.join(", ")})`);
for (const [v, p] of Object.entries(opt.images)) if (!existsSync(p)) fail(`--image ${v}: no such file ${p}`);

function fail(msg) {
  console.error(`capture-thumbnails: ${msg}`);
  process.exit(1);
}

function run(cmd, cmdArgs, cwd) {
  console.log(`  $ ${cmd} ${cmdArgs.join(" ")}   (in ${cwd})`);
  const r = spawnSync(cmd, cmdArgs, { cwd, stdio: "inherit" });
  if (r.status !== 0) fail(`${cmd} ${cmdArgs.join(" ")} exited with ${r.status ?? r.signal}`);
}

// ---- builds ----
function v1Sha() {
  const wf = readFileSync(join(REPO, ".github/workflows/deploy.yml"), "utf8");
  const m = /^\s*V1_SHA:\s*["']?([0-9a-f]{7,40})/m.exec(wf);
  if (!m) fail("could not find V1_SHA in .github/workflows/deploy.yml");
  return m[1];
}

function buildInto(root) {
  const need = opt.only.filter((v) => !opt.images[v]);
  if (need.includes("v2")) {
    const app = join(REPO, "app");
    if (!existsSync(join(app, "node_modules"))) fail("app/node_modules is missing: run `npm ci` in app/ first");
    console.log("Building v2 from the working tree");
    run("npx", ["vite", "build", "--base", "/sl5/v2/", "--outDir", join(root, "v2"), "--emptyOutDir", "--logLevel", "warn"], app);
  }
  if (need.includes("v1")) {
    const sha = v1Sha();
    const src = join(root, "v1-src");
    console.log(`Building v1 from ${sha}`);
    run("git", ["worktree", "add", "--detach", src, sha], REPO);
    try {
      run("npm", ["ci", "--no-audit", "--no-fund"], join(src, "app"));
      run("npx", ["vite", "build", "--base", "/sl5/v1/", "--outDir", join(root, "v1"), "--emptyOutDir", "--logLevel", "warn"], join(src, "app"));
    } finally {
      spawnSync("git", ["worktree", "remove", "--force", src], { cwd: REPO, stdio: "inherit" });
    }
  }
}

// ---- a static server that maps /sl5/* to <root>/*, like GitHub Pages ----
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon",
  ".woff2": "font/woff2", ".woff": "font/woff", ".txt": "text/plain; charset=utf-8",
};

function serve(root, prefix = "/sl5/") {
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (path === prefix.slice(0, -1)) {
      res.writeHead(301, { Location: prefix });
      return res.end();
    }
    if (!path.startsWith(prefix)) {
      res.writeHead(404);
      return res.end("not found");
    }
    let file = normalize(join(root, path.slice(prefix.length)));
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403);
      return res.end();
    }
    if (existsSync(file) && statSync(file).isDirectory()) {
      if (!path.endsWith("/")) {
        res.writeHead(301, { Location: path + "/" });
        return res.end();
      }
      file = join(file, "index.html");
    }
    if (!existsSync(file)) {
      res.writeHead(404);
      return res.end("not found");
    }
    res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
    res.end(readFileSync(file));
  });
  return new Promise((ok) => server.listen(0, "127.0.0.1", () => ok(server)));
}

// ---- Playwright ----
function loadChromium() {
  const roots = [process.env.PLAYWRIGHT_DIR, SITE, join(REPO, "app"), process.cwd()].filter(Boolean);
  for (const root of roots) {
    try {
      return createRequire(join(root, "package.json"))("playwright").chromium;
    } catch {
      /* try the next root */
    }
  }
  fail("Playwright not found. Install it once outside the repo and point PLAYWRIGHT_DIR at it:\n" +
    "  mkdir -p /tmp/pw && cd /tmp/pw && npm init -y && npm i playwright@1.62.0 && npx playwright@1.62.0 install chromium\n" +
    "  PLAYWRIGHT_DIR=/tmp/pw node site/capture-thumbnails.mjs");
}

async function captureMainScreen(browser, url, version) {
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1, reducedMotion: "reduce" });
  // First-run modal: mark it seen up front, under v1's key and under v2's own
  // `sl5v2_intro_seen` (the versions share an origin, so v2 prefixes its keys).
  // The button/Escape fallback below catches any other key.
  await context.addInitScript(() => {
    try {
      for (const key of ["sl5_intro_seen", "sl5v2_intro_seen"]) localStorage.setItem(key, "1");
    } catch {
      /* storage unavailable */
    }
  });
  const page = await context.newPage();
  // Keep thumbnail runs out of the site's analytics.
  await page.route(/googletagmanager\.com|google-analytics\.com/, (r) => r.abort());
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && !/ERR_FAILED|googletagmanager/.test(m.text()) && errors.push(m.text()));

  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelector("#root")?.childElementCount > 0, null, { timeout: 20000 });
  for (const re of [/^(start )?explor/i, /skip/i, /^close$/i, /got it/i]) {
    const btn = page.locator('[role="dialog"] button', { hasText: re }).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
      break;
    }
  }
  if (await page.locator('[role="dialog"]').first().isVisible().catch(() => false)) await page.keyboard.press("Escape");
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200); // layout and fit-to-view settle
  if (errors.length) console.warn(`  ${version}: page reported errors:\n    ${errors.join("\n    ")}`);
  const png = await page.screenshot({ type: "png" });
  await context.close();
  return png;
}

// Downsize and encode in the browser: canvas high-quality smoothing, halving
// first so large sources (a 2x mockup) don't alias, then WebP.
async function toWebp(browser, buffer, mime) {
  const page = await browser.newPage();
  const dataUrl = `data:${mime};base64,${buffer.toString("base64")}`;
  const out = await page.evaluate(
    async ({ dataUrl, w, h, q }) => {
      const img = new Image();
      img.src = dataUrl;
      await img.decode();
      let src = img;
      let sw = img.naturalWidth;
      let sh = img.naturalHeight;
      while (sw >= w * 2) {
        const c = new OffscreenCanvas(Math.round(sw / 2), Math.round(sh / 2));
        const g = c.getContext("2d");
        g.imageSmoothingQuality = "high";
        g.drawImage(src, 0, 0, c.width, c.height);
        src = c;
        sw = c.width;
        sh = c.height;
      }
      // Cover-crop to the thumbnail's aspect ratio, anchored top-left like the
      // landing page's object-position.
      const scale = Math.max(w / sw, h / sh);
      const cw = w / scale;
      const ch = h / scale;
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const g = c.getContext("2d");
      g.imageSmoothingQuality = "high";
      g.drawImage(src, 0, 0, cw, ch, 0, 0, w, h);
      return c.toDataURL("image/webp", q);
    },
    { dataUrl, w: THUMB.width, h: THUMB.height, q: QUALITY },
  );
  await page.close();
  if (!out.startsWith("data:image/webp")) fail("this Chromium cannot encode WebP");
  return Buffer.from(out.split(",")[1], "base64");
}

// ---- main ----
const chromium = loadChromium();
let root = opt.dist;
let tmp = null;
const toCapture = opt.only.filter((v) => !opt.images[v]);
if (toCapture.length && !root) {
  tmp = mkdtempSync(join(tmpdir(), "sl5-thumbs-"));
  root = tmp;
  buildInto(root);
}
for (const v of toCapture) if (!existsSync(join(root, v, "index.html"))) fail(`${join(root, v)} has no build (index.html missing)`);

const server = toCapture.length ? await serve(root) : null;
const browser = await chromium.launch();
try {
  mkdirSync(opt.out, { recursive: true });
  for (const v of opt.only) {
    let webp;
    if (opt.images[v]) {
      console.log(`${v}: resizing ${opt.images[v]}`);
      const mime = /\.png$/i.test(opt.images[v]) ? "image/png" : /\.webp$/i.test(opt.images[v]) ? "image/webp" : "image/jpeg";
      webp = await toWebp(browser, readFileSync(opt.images[v]), mime);
    } else {
      const url = `http://127.0.0.1:${server.address().port}/sl5/${v}/`;
      console.log(`${v}: capturing ${url}`);
      webp = await toWebp(browser, await captureMainScreen(browser, url, v), "image/png");
    }
    const file = join(opt.out, `${v}.webp`);
    writeFileSync(file, webp);
    console.log(`  wrote ${file} (${THUMB.width}x${THUMB.height}, ${Math.round(webp.length / 1024)} KB)`);
  }
} finally {
  await browser.close();
  server?.close();
  if (tmp) rmSync(tmp, { recursive: true, force: true });
}
