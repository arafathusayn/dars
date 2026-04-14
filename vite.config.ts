import { defineConfig } from "vite";
import { devtools } from "@tanstack/devtools-vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { paraglideVitePlugin } from "@inlang/paraglide-js";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

import settings from "./project.inlang/settings.json" with { type: "json" };

const { baseLocale, locales } = settings;

/** Generate locale-prefixed variants for every route path */
function localizePages(paths: string[]) {
  return paths.flatMap((path) =>
    locales.map((locale) => ({
      path: locale === baseLocale ? path : `/${locale}${path}`,
    })),
  );
}

const config = defineConfig({
  server: {
    allowedHosts: true,
  },
  plugins: [
    devtools(),
    paraglideVitePlugin({
      project: "./project.inlang",
      outdir: "./src/paraglide",
      strategy: ["url", "baseLocale"],
    }),
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    tanstackStart({
      server: {
        entry: "entry-server",
      },
      pages: localizePages(["/", "/amar-lessons/1-body-parts"]),
      prerender: {
        enabled: true,
        crawlLinks: true,
      },
    }),
    viteReact({
      babel: {
        plugins: ["babel-plugin-react-compiler"],
      },
    }),
  ],
});

export default config;
