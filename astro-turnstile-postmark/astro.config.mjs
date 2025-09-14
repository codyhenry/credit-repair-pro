// astro-turnstile-postmark/astro.config.mjs
import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";

export default defineConfig({
  integrations: [tailwind({ applyBaseStyles: true })],
  output: "static",
  site: "https://codyhenry.github.io",
  base: "/",
});
