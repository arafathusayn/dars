/**
 * Injects ayah reference data into quranic-verbs.tsx:
 *  1. Adds `ex: [number, number]` to VerbForm interface
 *  2. Inserts AYAHS map constant (lookup table of ayah texts)
 *  3. Adds `ex: [surah, ayah]` to each of the 844 form entries
 *
 * Run: bun scripts/inject-ayah-data.ts
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

let tsx = await Bun.file("src/quranic-verbs.tsx").text();

// ── Step 1: Update VerbForm interface ───────────────────────────────

const oldInterface = `interface VerbForm {
  ar: string;
  tr: string;
  ty: VerbType;
  n: number;
  mn: Record<Lang, string>;
}`;

const newInterface = `interface VerbForm {
  ar: string;
  tr: string;
  ty: VerbType;
  n: number;
  mn: Record<Lang, string>;
  ex: [number, number];
}`;

if (!tsx.includes(oldInterface)) {
  console.error("ERROR: Could not find VerbForm interface to update");
  process.exit(1);
}
tsx = tsx.replace(oldInterface, newInterface);
console.log("✓ Updated VerbForm interface");

// ── Step 2: Generate and insert AYAHS map ───────────────────────────

const sortedKeys = Object.keys(ayahsUsed).sort((a, b) => {
  const [sa, aa] = a.split(":").map(Number);
  const [sb, ab] = b.split(":").map(Number);
  return sa * 10000 + aa - (sb * 10000 + ab);
});

let ayahsCode =
  "\n// ── Ayah Texts (lookup table, keyed by surah:ayah) ──────────────────\n\n";
ayahsCode += "const AYAHS: Record<string, string> = {\n";
for (const key of sortedKeys) {
  // Escape any problematic chars for a TS string
  const text = ayahsUsed[key].replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  ayahsCode += `  "${key}": "${text}",\n`;
}
ayahsCode += "};\n";

const insertMarker = "// ── Verb Data ──";
if (!tsx.includes(insertMarker)) {
  console.error("ERROR: Could not find Verb Data marker");
  process.exit(1);
}
tsx = tsx.replace(insertMarker, ayahsCode + "\n" + insertMarker);
console.log(`✓ Inserted AYAHS map (${sortedKeys.length} entries)`);

// ── Step 3: Add ex field to each form entry ─────────────────────────

// Build lookup: for each verb ID, map "ar|n" → [surah, ayah]
const exLookup: Record<string, Map<string, [number, number]>> = {};
for (const [verbId, forms] of Object.entries(formsData)) {
  exLookup[verbId] = new Map();
  for (const f of forms) {
    exLookup[verbId].set(`${f.ar}|${f.n}`, f.ex);
  }
}

const lines = tsx.split("\n");
const newLines: string[] = [];
let currentVerbId = 0;
let formUpdates = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // Track which verb block we're in by matching "id: N,"
  const idMatch = line.match(/^\s+id:\s*(\d+),\s*$/);
  if (idMatch) {
    currentVerbId = parseInt(idMatch[1]);
  }

  // Check if this line is a form entry (has ar:, ty:, mn:, and ends with } },)
  if (
    currentVerbId > 0 &&
    line.includes('ar: "') &&
    line.includes("mn: {") &&
    line.trimEnd().endsWith("} },")
  ) {
    const arMatch = line.match(/ar:\s*"([^"]+)"/);
    const nMatch = line.match(/,\s*n:\s*(\d+),/);

    if (arMatch && nMatch) {
      const ar = arMatch[1];
      const n = parseInt(nMatch[1]);
      const lookup = exLookup[String(currentVerbId)];

      if (lookup) {
        const ex = lookup.get(`${ar}|${n}`);
        if (ex) {
          // Insert ex before the closing } },
          const updated = line.replace(
            /\}\s*\},\s*$/,
            `}, ex: [${ex[0]}, ${ex[1]}] },`,
          );
          newLines.push(updated);
          formUpdates++;
          continue;
        }
      }
    }
  }

  newLines.push(line);
}

tsx = newLines.join("\n");
console.log(`✓ Added ex field to ${formUpdates} form entries`);

if (formUpdates !== 844) {
  console.warn(
    `⚠ Expected 844 forms, got ${formUpdates}. Checking mismatches...`,
  );

  // Debug: find which forms weren't matched
  for (const [verbId, lookup] of Object.entries(exLookup)) {
    for (const [key] of lookup) {
      const [ar, n] = key.split("|");
      // Check if this ar+n combo appears in the file
      if (!tsx.includes(`ar: "${ar}"`)) {
        console.warn(`  Verb ${verbId}: ar="${ar}" n=${n} not found in file`);
      }
    }
  }
}

// ── Write result ────────────────────────────────────────────────────

await Bun.write("src/quranic-verbs.tsx", tsx);
const sizeKB = (new TextEncoder().encode(tsx).length / 1024).toFixed(1);
console.log(`\n✓ Wrote src/quranic-verbs.tsx (${sizeKB} KB)`);
