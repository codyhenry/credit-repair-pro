import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";

export default defineConfig({
  integrations: [tailwind({ applyBaseStyles: true })],
  output: "static",
  // Put the production build where GitHub Pages expects it
  build: { outDir: "../docs" }, // <<— build into /docs at repo root
});
