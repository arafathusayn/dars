/**
 * Generates the TypeScript code snippets to embed in quranic-verbs.tsx:
 * 1. The AYAHS constant (map of "surah:ayah" → ayah text)
 * 2. Updated form entries with `ex: [surah, ayah]` fields
 *
 * Run: bun scripts/generate-component-data.ts
 */

const formsData: Record<
  string,
  Array<{
    ar: string;
    tr: string;
    ty: string;
    n: number;
    mn: { en: string; bn: string };
    ex: [number, number];
  }>
> = await Bun.file("scripts/verb-forms-with-ayahs.json").json();

const ayahsUsed: Record<string, string> = await Bun.file(
  "scripts/ayahs-used.json",
).json();

// ── Generate AYAHS map ──────────────────────────────────────────────

let ayahsCode = "const AYAHS: Record<string, string> = {\n";
// Sort by surah:ayah numerically
const sortedKeys = Object.keys(ayahsUsed).sort((a, b) => {
  const [sa, aa] = a.split(":").map(Number);
  const [sb, ab] = b.split(":").map(Number);
  return sa * 10000 + aa - (sb * 10000 + ab);
});
for (const key of sortedKeys) {
  const text = ayahsUsed[key].replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  ayahsCode += `  "${key}": "${text}",\n`;
}
ayahsCode += "};\n";

await Bun.write("scripts/ayahs-ts-snippet.txt", ayahsCode);
console.log(`Generated AYAHS map: ${sortedKeys.length} entries`);

// ── Generate updated forms for each verb ────────────────────────────
// Output as a JSON that can be copy-pasted into the forms arrays

let formsSnippet = "";
for (const [verbId, forms] of Object.entries(formsData)) {
  formsSnippet += `\n// === Verb ${verbId} forms ===\n`;
  formsSnippet += "[\n";
  for (const f of forms) {
    const enEsc = f.mn.en.replace(/"/g, '\\"');
    const bnEsc = f.mn.bn.replace(/"/g, '\\"');
    formsSnippet += `      { ar: "${f.ar}", tr: "${f.tr}", ty: "${f.ty}", n: ${f.n}, mn: { en: "${enEsc}", bn: "${bnEsc}" }, ex: [${f.ex[0]}, ${f.ex[1]}] },\n`;
  }
  formsSnippet += "]\n";
}

await Bun.write("scripts/forms-ts-snippet.txt", formsSnippet);
console.log("Generated forms snippet");

// ── Stats ───────────────────────────────────────────────────────────
const ayahsSize = new TextEncoder().encode(ayahsCode).length;
console.log(`\nAYAHS map size: ${(ayahsSize / 1024).toFixed(1)} KB`);

// Check for interesting "last ayah" stats
for (const [verbId, forms] of Object.entries(formsData)) {
  const lastSurah = Math.max(...forms.map((f) => f.ex[0]));
  const lateForms = forms.filter((f) => f.ex[0] >= 100);
  if (lateForms.length > 0) {
    console.log(
      `Verb ${verbId}: ${lateForms.length} forms have last occurrence in surah 100+`,
    );
  }
}
