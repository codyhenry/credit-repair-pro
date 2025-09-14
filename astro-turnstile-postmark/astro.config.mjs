import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";

export default defineConfig({
  integrations: [tailwind({ applyBaseStyles: true })],

  // Netlify will just serve static files from dist
  output: "static",

  // 👇 IMPORTANT for GitHub Pages / Netlify project sites
  // Set these to match your production URL (base path fixes the CSS issue you saw)
  site: "https://temp-credit-site-jordan.netlify.app", // replace with your real Netlify URL
  base: "/",
});
