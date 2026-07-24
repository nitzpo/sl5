import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/sl5/',
  plugins: [react(), tailwindcss()],
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
