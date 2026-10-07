import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { loadEnv } from "vite";
import { releaseConfigurationErrors } from "./src/domain/releaseConfig.ts";

if (process.env.VERCEL_ENV === "production") {
  const errors = releaseConfigurationErrors({ ...loadEnv("production", process.cwd(), "VITE_"), ...process.env });
  if (errors.length) throw new Error(`Production release blocked: ${errors.join("; ")}. Demo fallback is not permitted.`);
}

export default defineConfig({
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          includeDependenciesRecursively: false,
          groups: [
            { name: "react-runtime", test: /node_modules\/(?:react|react-dom|scheduler)\// },
            { name: "validation", test: /node_modules\/zod\// }
          ]
        }
      }
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      injectRegister: false,
      includeAssets: ["favicon.svg", "icon-maskable.svg"],
      manifest: {
        id: "/",
        name: "Pelvic Trauma Decisions",
        short_name: "Pelvic Decisions",
        description: "Formative pelvic trauma decision practice for supervised clinical students.",
        theme_color: "#123148",
        background_color: "#fffaf0",
        display: "standalone",
        start_url: "/",
        scope: "/",
        categories: ["education", "medical"],
        icons: [
          { src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
          { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: "/index.html",
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        globPatterns: ["**/*.{js,css,html,svg,png,jpg,json,pdf}"],
        runtimeCaching: []
      },
      devOptions: { enabled: true, type: "module" }
    })
  ],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    coverage: { reporter: ["text", "json-summary"] }
  }
});
