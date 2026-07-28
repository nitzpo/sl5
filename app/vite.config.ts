import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/sl5/',
  plugins: [react(), tailwindcss()],
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
