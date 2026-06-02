import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    globals: true,
    exclude: ['.worktrees/**', 'node_modules/**', 'tests/e2e/**', '**/._*'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
