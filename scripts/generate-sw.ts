import { generateSW } from "workbox-build";

const { count, size } = await generateSW({
  globDirectory: "dist/client",
  globPatterns: [
    "**/*.{html,js,css,png,ico,json,txt,webp,avif,svg,woff,woff2}",
  ],
  globIgnores: ["sw.js", "workbox-*.js", "manifest.json"],
  swDest: "dist/client/sw.js",
  skipWaiting: true,
  clientsClaim: true,
  cleanupOutdatedCaches: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
      handler: "StaleWhileRevalidate",
      options: { cacheName: "google-fonts", expiration: { maxEntries: 20 } },
    },
  ],
});

console.log(`SW generated: ${count} files precached (${(size / 1024).toFixed(1)} KB)`);
