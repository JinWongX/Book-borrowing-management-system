import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    testTimeout: 30000,
    threads: true,
    minThreads: 1,
    maxThreads: 2,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      all: true,
      include: ['src/**/*'],
      exclude: [
        'src/**/*.test.{js,jsx}',
        'src/**/__tests__/**',
        'src/assets/**',
        'src/main.jsx',
        'src/index.css',
      ],
      statements: 95,
      branches: 90,
      functions: 85,
      lines: 95,
    },
  },
})
