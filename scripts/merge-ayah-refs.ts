/**
 * Merges ayah references into the verb forms data and outputs
 * the updated TypeScript code for quranic-verbs.tsx.
 *
 * Strategy:
 * - Each VerbForm gets an `ex: [surah, ayah]` tuple
 * - A separate AYAHS map stores the unique ayah texts, keyed by "s:a"
 * - This avoids duplicating ayah text across forms that share the same ayah
 *
 * Run: bun scripts/merge-ayah-refs.ts
 */

const ayahRefs: Record<
  string,
  Record<string, { s: number; a: number; t: string }>
> = await Bun.file("scripts/ayah-refs.json").json();

const ayahTexts: Record<string, string> = await Bun.file(
  "scripts/ayah-texts.json",
).json();

const verbFormsFinal: Record<
  string,
  Array<{
    ar: string;
    tr: string;
    roman: string;
    ty: string;
    n: number;
    mn: { en: string; bn: string };
  }>
> = await Bun.file("scripts/verb-forms-final.json").json();

// Build the ex mapping: for each verb form, find its ayah reference
interface FormWithEx {
  ar: string;
  tr: string;
  ty: string;
  n: number;
  mn: { en: string; bn: string };
  ex: [number, number]; // [surah, ayah]
}

const output: Record<string, FormWithEx[]> = {};
let matched = 0;
let unmatched = 0;

for (const [verbId, forms] of Object.entries(verbFormsFinal)) {
  const refs = ayahRefs[verbId] || {};
  output[verbId] = forms.map((form) => {
    const ref = refs[form.ar];
    if (ref) {
      matched++;
      return {
        ar: form.ar,
        tr: form.tr,
        ty: form.ty,
        n: form.n,
        mn: form.mn,
        ex: [ref.s, ref.a] as [number, number],
      };
    } else {
      unmatched++;
      console.warn(`  No ref for verb ${verbId}, form: ${form.ar}`);
      return {
        ar: form.ar,
        tr: form.tr,
        ty: form.ty,
        n: form.n,
        mn: form.mn,
        ex: [0, 0] as [number, number], // fallback
      };
    }
  });
}

console.log(`Matched: ${matched}, Unmatched: ${unmatched}`);

// Write the merged data
await Bun.write(
  "scripts/verb-forms-with-ayahs.json",
  JSON.stringify(output, null, 2),
);
console.log("Wrote scripts/verb-forms-with-ayahs.json");

// Write the unique ayahs map (for embedding in component)
// Only include ayahs that are actually referenced
const usedRefs = new Set<string>();
for (const forms of Object.values(output)) {
  for (const form of forms) {
    if (form.ex[0] > 0) usedRefs.add(`${form.ex[0]}:${form.ex[1]}`);
  }
}

const usedAyahs: Record<string, string> = {};
for (const key of usedRefs) {
  if (ayahTexts[key]) usedAyahs[key] = ayahTexts[key];
}

await Bun.write("scripts/ayahs-used.json", JSON.stringify(usedAyahs, null, 2));
console.log(
  `Wrote scripts/ayahs-used.json (${Object.keys(usedAyahs).length} ayahs)`,
);
