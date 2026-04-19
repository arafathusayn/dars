/**
 * Replaces the AYAHS constant in quranic-verbs.tsx with an expanded version
 * that includes both Arabic text and translations:
 *   { "s:a": { ar: "...", en: "...", bn: "..." } }
 *
 * Run: bun scripts/inject-ayah-translations.ts
 */

const translations: Record<string, { en: string; bn: string }> = await Bun.file(
  "scripts/ayah-translations.json",
).json();

const ayahsUsed: Record<string, string> = await Bun.file(
  "scripts/ayahs-used.json",
).json();

let tsx = await Bun.file("src/quranic-verbs.tsx").text();

// Build new AYAHS map with translations
const sortedKeys = Object.keys(ayahsUsed).sort((a, b) => {
  const [sa, aa] = a.split(":").map(Number);
  const [sb, ab] = b.split(":").map(Number);
  return sa * 10000 + aa - (sb * 10000 + ab);
});

let newAyahsCode =
  "const AYAHS: Record<string, { ar: string; en: string; bn: string }> = {\n";
for (const key of sortedKeys) {
  const ar = ayahsUsed[key].replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const tr = translations[key] || { en: "", bn: "" };
  const en = tr.en.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const bn = tr.bn.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  newAyahsCode += `  "${key}": { ar: "${ar}", en: "${en}", bn: "${bn}" },\n`;
}
newAyahsCode += "};";

// Replace old AYAHS constant
const oldStart = "const AYAHS: Record<string, string> = {";
const oldEnd = "};";

const ayahsStartIdx = tsx.indexOf(oldStart);
if (ayahsStartIdx === -1) {
  console.error("ERROR: Could not find AYAHS constant start");
  process.exit(1);
}

// Find the matching closing brace
let braceCount = 0;
let ayahsEndIdx = -1;
for (let i = ayahsStartIdx; i < tsx.length; i++) {
  if (tsx[i] === "{") braceCount++;
  if (tsx[i] === "}") {
    braceCount--;
    if (braceCount === 0) {
      // Include the semicolon after }
      ayahsEndIdx = tsx[i + 1] === ";" ? i + 2 : i + 1;
      break;
    }
  }
}

if (ayahsEndIdx === -1) {
  console.error("ERROR: Could not find AYAHS constant end");
  process.exit(1);
}

tsx = tsx.slice(0, ayahsStartIdx) + newAyahsCode + tsx.slice(ayahsEndIdx);

await Bun.write("src/quranic-verbs.tsx", tsx);
const sizeKB = (new TextEncoder().encode(tsx).length / 1024).toFixed(1);
console.log(
  `✓ Updated AYAHS map with translations (${sortedKeys.length} entries)`,
);
console.log(`✓ Wrote src/quranic-verbs.tsx (${sizeKB} KB)`);
