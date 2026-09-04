import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    /**
     * The `@/` alias, resolved directly rather than via `tsconfigPaths: true`.
     *
     * Reading it from tsconfig.json means Vite also honours that file's
     * `include`, which `next build` rewrites to cover `.next/dev/types/**`.
     * Once `.next` grows to any real size, the scan makes every Vitest worker
     * time out during startup with "Timeout waiting for worker to respond" —
     * a failure that looks like a broken test runner rather than a config
     * problem. One explicit alias avoids the whole class of issue.
     */
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**"],
  },
  server: {
    watch: {
      ignored: ["**/.next/**", "**/node_modules/**"],
    },
  },
});
