import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/sl5/',
  plugins: [react(), tailwindcss()],
  test: {
    globals: true,
    environment: 'jsdom',
  },
})
