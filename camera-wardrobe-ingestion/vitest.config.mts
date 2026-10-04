import { defineConfig } from "vitest/config";

// Backend tests (convex/*.test.ts) run against convex-test, an in-process
// Convex: real functions, validators and auth identities, no deployment.
export default defineConfig({
  test: {
    environment: "edge-runtime",
    include: ["convex/**/*.test.ts"],
    server: { deps: { inline: ["convex-test"] } },
  },
});
