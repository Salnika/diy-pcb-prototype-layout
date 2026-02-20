import react from "@vitejs/plugin-react";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [vanillaExtractPlugin(), react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      all: true,
      reporter: ["text", "html", "lcov"],
      include: [
        "src/app/appUtils.ts",
        "src/app/components/toolDefinitions.ts",
        "src/app/hooks/useAppKeyboardShortcuts.ts",
        "src/app/hooks/useProjectIO.ts",
        "src/features/board/boardGeometry.ts",
        "src/features/board/boardPlacement.ts",
        "src/features/export/download.ts",
        "src/features/export/exportPng.ts",
        "src/model/autoLayout.common.ts",
        "src/model/autoLayout.constants.ts",
        "src/model/autoLayout.placement.ts",
        "src/model/footprints.ts",
        "src/model/hole.ts",
        "src/model/ids.ts",
        "src/model/labels.ts",
        "src/model/project.ts",
      ],
      exclude: ["**/*.d.ts", "src/vite-env.d.ts"],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
        perFile: true,
      },
    },
  },
});
