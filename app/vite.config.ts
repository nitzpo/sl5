import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'
import type { Connect, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Redirect `/sl5/intro` to `/sl5/intro/`. Without the trailing slash Vite's SPA
// html-fallback serves the root index.html, so the URL silently lands on the app
// instead of the introduction — a shared link missing one character would send
// readers to the wrong page. GitHub Pages 301s directory URLs itself; this makes
// `npm run dev` and `npm run preview` behave the same way.
//
// `/intro` and `/intro/` are handled too, and both land on `/sl5/intro/`: with
// `base: '/sl5/'` Vite's base middleware 404s anything outside the prefix, so
// redirecting `/intro` to `/intro/` would only trade one wrong page for a dead
// end.
const INTRO = '/sl5/intro/'
const ALIASES = ['/sl5/intro', '/intro', '/intro/']

function introTrailingSlash(): Plugin {
  const redirect: Connect.NextHandleFunction = (req, res, next) => {
    const url = req.url ?? ''
    // indexOf, not split('?'): a query string may legally contain further `?`
    // characters, and split would drop everything after the second one.
    const q = url.indexOf('?')
    const path = q === -1 ? url : url.slice(0, q)
    const query = q === -1 ? '' : url.slice(q)
    if (ALIASES.includes(path)) {
      res.writeHead(301, { Location: `${INTRO}${query}` })
      res.end()
      return
    }
    next()
  }
  return {
    name: 'intro-trailing-slash',
    // Block bodies, not expressions: `middlewares.use()` returns the app, and a
    // returned function is taken as a post hook and invoked as middleware.
    configureServer(server) {
      server.middlewares.use(redirect)
    },
    configurePreviewServer(server) {
      server.middlewares.use(redirect)
    },
  }
}

export default defineConfig({
  base: '/sl5/',
  plugins: [react(), tailwindcss(), introTrailingSlash()],
  build: {
    // Two-page build: the explorable at /sl5/ and a standalone introduction at
    // /sl5/intro/. The intro is its own entry (not a route) so it ships its own
    // bundle, never boots the simulation store, and gets a real shareable URL
    // on GitHub Pages without a router or a 404.html fallback.
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        intro: resolve(import.meta.dirname, 'intro/index.html'),
      },
    },
  },
  server: {
    watch: {
      // The project lives on the Windows filesystem (/mnt/c, a 9p mount) but
      // Vite runs under WSL. Linux inotify events don't fire for edits on that
      // mount, so HMR never triggers — poll for changes instead.
      usePolling: true,
      interval: 300,
    },
  },
  test: {
    globals: true,
    // Node by default, jsdom only where it's earned. Three of thirteen test
    // files render React; the rest are pure engine and data checks. Building a
    // jsdom for all thirteen dominated the run — 433s of summed worker time
    // against 11s of actual test execution — because every jsdom is another
    // 11MB of modules read off the 9p mount. Those three opt in with a
    // `// @vitest-environment jsdom` docblock.
    environment: 'node',
    // Threads share one module graph per worker; forks re-read react and jsdom
    // from /mnt/c for every file, which is also what made a cold worker miss
    // the pool handshake and fail the run with "Timeout waiting for worker".
    pool: 'threads',
    teardownTimeout: 30_000,
  },
})
