import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const src = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/tests/**/*.test.ts"],
    setupFiles: ["src/tests/setup.ts"],
    // The RLS test talks to the project in .env; give it room but never hang.
    testTimeout: 20000,
    hookTimeout: 20000,
  },
  resolve: {
    alias: {
      "@": src,
      // Server modules import "server-only"; in a Node test that guard is a
      // build-time convention, not a runtime dependency.
      "server-only": fileURLToPath(
        new URL("./src/tests/stubs/server-only.ts", import.meta.url),
      ),
    },
  },
});
