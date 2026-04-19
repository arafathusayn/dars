import { createFileRoute } from "@tanstack/react-router";
import FullstackPrep from "@/fullstack-prep";

const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap";

export const Route = createFileRoute("/misc-lessons/fullstack-prep")({
  component: FullstackPrep,
  head: () => ({
    meta: [{ title: "Fullstack Prep — Dars" }],
    links: [{ rel: "stylesheet", href: GOOGLE_FONTS_URL }],
  }),
});
