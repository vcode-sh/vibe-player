import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    projects: [
      {
        test: {
          environment: "happy-dom",
          include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
          name: "dom",
          setupFiles: ["./test/setup.ts"],
        },
      },
      {
        test: {
          environment: "node",
          include: ["scripts/**/*.test.mjs"],
          name: "node",
        },
      },
    ],
  },
});
