import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";

import { getLocale } from "#/paraglide/runtime";

import appCss from "../styles.css?url";

import type { QueryClient } from "@tanstack/react-query";

interface MyRouterContext {
  queryClient: QueryClient;
}

/**
 * Blocking inline script that runs before first paint.
 * Reads saved theme from localStorage, detects system color scheme,
 * and applies data-theme on <html> immediately to prevent FOUC.
 */
const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem('aq-t');var mode=(s==='light'||s==='dark'||s==='system')?s:'system';var dark=window.matchMedia('(prefers-color-scheme:dark)').matches;var resolved=mode==='system'?(dark?'dark':'light'):mode;document.documentElement.setAttribute('data-theme',resolved);document.documentElement.style.colorScheme=resolved;var tc=document.querySelector('meta[name="theme-color"]');if(tc)tc.setAttribute('content',resolved==='dark'?'#1c1c1e':'#ffffff')}catch(e){}})();`;

const SW_REGISTER_SCRIPT = `if('serviceWorker'in navigator&&location.protocol==='https:'){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js')})}`;

export const Route = createRootRouteWithContext<MyRouterContext>()({
  beforeLoad: async () => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("lang", getLocale());
    }
  },

  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Dars" },
      { name: "theme-color", content: "#ffffff" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "Dars" },
      {
        name: "description",
        content:
          "Interactive Arabic vocabulary app with quizzes, flashcards, and Bengali/English i18n",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.json" },
      {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: "/apple-touch-icon.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "512x512",
        href: "/logo512.png",
      },
    ],
    scripts: [
      { tag: "script" as const, children: THEME_INIT_SCRIPT },
      { tag: "script" as const, children: SW_REGISTER_SCRIPT },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang={getLocale()} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
