/**
 * Extracts all unique verb forms for the top 12 Quranic verbs from the
 * Quranic Arabic Corpus morphology file (v0.4).
 *
 * Uses the transliteration-encoded text. Groups by full word (including
 * prefixes like وَ/فَ) to get accurate unique form counts.
 */

const CORPUS_PATH = "src/data/quranic-corpus-morphology-0.4.txt";

interface VerbDef {
  id: number;
  root: string;
  lem: string;
}

const VERBS: VerbDef[] = [
  { id: 1, root: "qwl", lem: "qaAla" },
  { id: 2, root: "kwn", lem: "kaAna" },
  { id: 3, root: "Amn", lem: "'aAmana" },
  { id: 4, root: "Elm", lem: "Ealima" },
  { id: 5, root: "jEl", lem: "jaEala" },
  { id: 6, root: "kfr", lem: "kafara" },
  { id: 7, root: "jyA", lem: "jaA^'a" },
  { id: 8, root: "Eml", lem: "Eamila" },
  { id: 9, root: "Aty", lem: "A^taY" }, // آتَى form IV
  { id: 10, root: "rAy", lem: "ra'aA" }, // رَأَى form I (includes >arayo for form IV)
  { id: 11, root: "Aty", lem: ">ataY" }, // أَتَى form I
  { id: 12, root: "$yA", lem: "$aA^'a" },
];

type VerbType =
  | "perfect"
  | "imperfect"
  | "imperative"
  | "jussive"
  | "subjunctive"
  | "passive";

function classifyType(features: string): VerbType {
  const isPassive = features.includes("|PASS");
  if (features.includes("|IMPV")) return "imperative";
  if (features.includes("|PERF")) return isPassive ? "passive" : "perfect";
  // IMPF
  if (isPassive) return "passive";
  if (features.includes("MOOD:JUS")) return "jussive";
  if (features.includes("MOOD:SUBJ")) return "subjunctive";
  return "imperfect"; // indicative or unmarked
}

interface Segment {
  form: string;
  tag: string;
  features: string;
}

async function main() {
  const text = await Bun.file(CORPUS_PATH).text();
  const lines = text.split("\n");

  // Group segments by word location (chapter:verse:word)
  const words = new Map<string, Segment[]>();

  for (const line of lines) {
    if (line.startsWith("#") || line.startsWith("LOCATION") || !line.trim())
      continue;
    const [loc, form, tag, features] = line.split("\t");
    if (!loc || !form || !tag) continue;
    // (1:1:1:1) -> (1:1:1)
    const wordLoc = loc.replace(/:\d+\)$/, ")");
    if (!words.has(wordLoc)) words.set(wordLoc, []);
    words.get(wordLoc)!.push({ form, tag, features: features || "" });
  }

  const results: Record<number, { tr: string; ty: VerbType; n: number }[]> = {};

  for (const verb of VERBS) {
    const formCounts = new Map<string, { ty: VerbType; n: number }>();

    for (const [, segments] of words) {
      const verbSeg = segments.find(
        (s) =>
          s.tag === "V" &&
          s.features.includes(`ROOT:${verb.root}`) &&
          s.features.includes(`LEM:${verb.lem}`),
      );
      if (!verbSeg) continue;

      const ty = classifyType(verbSeg.features);
      // Full transliteration = all segments concatenated
      const fullTr = segments.map((s) => s.form).join("");

      const existing = formCounts.get(fullTr);
      if (existing) {
        existing.n++;
      } else {
        formCounts.set(fullTr, { ty, n: 1 });
      }
    }

    results[verb.id] = [...formCounts.entries()]
      .sort((a, b) => b[1].n - a[1].n)
      .map(([tr, { ty, n }]) => ({ tr, ty, n }));
  }

  // Print summary
  for (const verb of VERBS) {
    const forms = results[verb.id];
    const total = forms.reduce((s, f) => s + f.n, 0);
    console.log(
      `Verb ${verb.id} (root:${verb.root}, lem:${verb.lem}): ${forms.length} unique forms, ${total} total occurrences`,
    );
  }

  await Bun.write(
    "scripts/verb-forms-raw.json",
    JSON.stringify(results, null, 2),
  );
  console.log("\nWrote scripts/verb-forms-raw.json");
}

main();
