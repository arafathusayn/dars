import { createFileRoute } from "@tanstack/react-router";
import QuranicVerbs from "@/quranic-verbs";

const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Noto+Sans+Bengali:wght@400;500;600;700&family=Source+Serif+4:ital,wght@0,300;0,400;0,600;0,700;0,800;1,400&display=swap";

export const Route = createFileRoute("/misc-lessons/quranic-verbs-1")({
  component: QuranicVerbs,
  head: () => ({
    meta: [{ title: "Quranic Verbs — Dars" }],
    links: [{ rel: "stylesheet", href: GOOGLE_FONTS_URL }],
  }),
});
