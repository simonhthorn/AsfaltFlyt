import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  resolve: {
    alias: {
      "@asfaltflyt/domain": new URL("../../packages/domain/src/index.ts", import.meta.url).pathname,
    },
  },
})
