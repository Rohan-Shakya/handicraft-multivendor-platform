import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/__tests__/**/*.test.ts"],
    environment: "node",
    globals: false,
    // Resolve .js extensions to .ts for ESM imports
    alias: {
      // Allow importing with .js extension (as required by ESM)
    },
  },
  resolve: {
    // Allow vitest to resolve .js → .ts for source files
    extensions: [".ts", ".js"],
  },
});
