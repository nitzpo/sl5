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
function introTrailingSlash(): Plugin {
  const redirect: Connect.NextHandleFunction = (req, res, next) => {
    const [path, query] = (req.url ?? '').split('?')
    if (path === '/sl5/intro' || path === '/intro') {
      res.writeHead(301, { Location: `${path}/${query ? `?${query}` : ''}` })
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
    environment: 'jsdom',
  },
})
