/**
 * Validates src/data/fullstack-prep.json — the LLM-generated interview-prep
 * content rendered via dangerouslySetInnerHTML. Guards shape, quiz answer
 * bounds + answer-position distribution, allowed quiz colors (icons are
 * shape-checked only), safe HTML across every rendered string, and
 * meta.totalQuizCount consistency. Run via: bun run validate
 */
import { z } from "zod/v4";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const DATA_PATH = join(
  import.meta.dirname,
  "..",
  "src",
  "data",
  "fullstack-prep.json",
);

// Colors must exist in COLOR_MAP in src/fullstack-prep.tsx.
const ALLOWED_COLORS = new Set([
  "purple",
  "info",
  "success",
  "amber",
  "warning",
  "teal",
  "red",
  "danger",
  "coral",
  "pink",
]);

const QAItem = z.tuple([z.string().min(1), z.string().min(1)]);

const QuizQuestion = z.object({
  q: z.string().min(1),
  options: z.array(z.string().min(1)).length(4),
  correct: z.number().int().min(0).max(3),
  explain: z.string().min(1),
});

const Schema = z.object({
  meta: z.object({
    title: z.string().min(1),
    subtitle: z.string().min(1),
    logoMark: z.string().min(1),
    description: z.string(),
    totalQuizCount: z.union([z.number(), z.string()]),
  }),
  fundamentals: z.record(
    z.string(),
    z.object({
      title: z.string().min(1),
      lede: z.string().min(1),
      content: z.string().min(1),
    }),
  ),
  questions: z.record(
    z.string(),
    z.object({ title: z.string().min(1), items: z.array(QAItem).min(1) }),
  ),
  quizzes: z.record(
    z.string(),
    z.object({
      title: z.string().min(1),
      icon: z.string().min(1).max(3),
      color: z.string(),
      questions: z.array(QuizQuestion).min(1),
    }),
  ),
  tips: z.string().min(1),
});

// HTML that must never appear in content injected via dangerouslySetInnerHTML.
const DANGER = [
  { re: /<script\b/i, name: "<script>" },
  { re: /<\/?(iframe|object|embed)\b/i, name: "<iframe>/<object>/<embed>" },
  { re: /\bon[a-z]+\s*=/i, name: "inline event handler (on*=)" },
  { re: /\bsrcdoc\b/i, name: "srcdoc attribute" },
  { re: /javascript:/i, name: "javascript: URL" },
];

function run() {
  const raw = readFileSync(DATA_PATH, "utf-8");
  // safeParse + prettifyError keeps failure output readable and consistent
  // with validate-messages.ts (Schema.parse would throw on the first issue).
  const parsed = Schema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    console.error("❌ fullstack-prep.json failed schema validation:");
    console.error(z.prettifyError(parsed.error));
    process.exit(1);
  }
  const data = parsed.data;
  const errors: Array<string> = [];

  // Quiz color allowlist + answer-position distribution.
  let quizTotal = 0;
  for (const [key, cat] of Object.entries(data.quizzes)) {
    quizTotal += cat.questions.length;
    if (!ALLOWED_COLORS.has(cat.color)) {
      errors.push(`quizzes.${key}: unknown color "${cat.color}"`);
    }
    if (cat.questions.length >= 10) {
      const counts = [0, 0, 0, 0];
      for (const q of cat.questions) counts[q.correct]++;
      // True half so the rule reads as a strict "> 50%" for odd lengths too
      // (e.g. 6/11 = 54.5% is flagged; 6/12 = 50% is allowed).
      const cap = cat.questions.length / 2;
      counts.forEach((n, pos) => {
        if (n === 0) {
          errors.push(
            `quizzes.${key}: answer position ${pos} never used (predictable)`,
          );
        }
        if (n > cap) {
          errors.push(
            `quizzes.${key}: answer position ${pos} used ${n}/${cat.questions.length} (> 50% — predictable)`,
          );
        }
      });
    }
  }

  // meta.totalQuizCount must match the real count.
  if (Number(data.meta.totalQuizCount) !== quizTotal) {
    errors.push(
      `meta.totalQuizCount=${data.meta.totalQuizCount} but actual quiz count=${quizTotal}`,
    );
  }

  // Dangerous HTML scan across every rendered string.
  const blobs: Array<[string, string]> = [];
  for (const [k, v] of Object.entries(data.fundamentals)) {
    blobs.push([`fundamentals.${k}.content`, v.content]);
  }
  for (const [k, v] of Object.entries(data.questions)) {
    v.items.forEach(([q, a], i) => {
      blobs.push([`questions.${k}.items[${i}].q`, q]);
      blobs.push([`questions.${k}.items[${i}].a`, a]);
    });
  }
  for (const [k, v] of Object.entries(data.quizzes)) {
    v.questions.forEach((q, i) => {
      blobs.push([`quizzes.${k}.questions[${i}].q`, q.q]);
      // The quiz question, every option, and the explanation are all rendered
      // via dangerouslySetInnerHTML in src/fullstack-prep.tsx, so scan them all.
      q.options.forEach((opt, j) => {
        blobs.push([`quizzes.${k}.questions[${i}].options[${j}]`, opt]);
      });
      blobs.push([`quizzes.${k}.questions[${i}].explain`, q.explain]);
    });
  }
  blobs.push(["tips", data.tips]);
  // A complete valid tag from the allowed set (open/close, with attributes).
  // After removing these, any remaining raw `<`/`>` is an unescaped operator
  // in a code sample (e.g. `i < 3`, `() => x`, `<uuid>`) that must be entity-
  // escaped, since the string is injected via dangerouslySetInnerHTML.
  const VALID_TAG =
    /<\/?(?:table|thead|tbody|tr|th|td|strong|code|em|pre|ul|ol|li|p|h[2-5]|div|br|span|a|b|i)(?:\s[^>]*)?\/?>/gi;
  for (const [where, html] of blobs) {
    for (const { re, name } of DANGER) {
      if (re.test(html)) errors.push(`${where}: contains ${name}`);
    }
    const residue = html.replace(VALID_TAG, "");
    const stray = residue.match(/[<>]/g);
    if (stray) {
      errors.push(
        `${where}: ${stray.length} unescaped ${stray.includes("<") ? "'<'" : "'>'"}/operator char(s) in HTML — escape as &lt;/&gt; (breaks dangerouslySetInnerHTML rendering)`,
      );
    }
  }

  if (errors.length) {
    console.error("❌ fullstack-prep.json validation failed:");
    for (const e of errors) console.error("  - " + e);
    process.exit(1);
  }

  console.log(
    `✓ fullstack-prep.json valid: ${Object.keys(data.fundamentals).length} fundamentals, ` +
      `${Object.values(data.questions).reduce((s, c) => s + c.items.length, 0)} Q&A items, ` +
      `${quizTotal} quizzes across ${Object.keys(data.quizzes).length} categories.`,
  );
}

run();
