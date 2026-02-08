import react from "@vitejs/plugin-react";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import { defineConfig } from "vite";

function resolveBase(): string {
  const repo = process.env.GITHUB_REPOSITORY?.split("/")[1];
  if (!repo) return "/";
  if (repo.endsWith(".github.io")) return "/";
  return `/${repo}/`;
}

export default defineConfig({
  base: resolveBase(),
  plugins: [vanillaExtractPlugin(), react()],
});
