/**
 * Replaces the AYAHS constant in quranic-verbs.tsx with updated translations.
 * Uses JSON.stringify for safe string escaping.
 *
 * Run: bun scripts/update-ayah-translations.ts
 */

const newTranslations: Record<string, { en: string; bn: string }> =
  await Bun.file("scripts/ayah-translations-v2.json").json();

const ayahsUsed: Record<string, string> =
  await Bun.file("scripts/ayahs-used.json").json();

let tsx = await Bun.file("src/quranic-verbs.tsx").text();

// Build new AYAHS map using JSON.stringify for safe escaping
const sortedKeys = Object.keys(ayahsUsed).sort((a, b) => {
  const [sa, aa] = a.split(":").map(Number);
  const [sb, ab] = b.split(":").map(Number);
  return sa * 10000 + aa - (sb * 10000 + ab);
});

let newCode = 'const AYAHS: Record<string, { ar: string; en: string; bn: string }> = {\n';
for (const key of sortedKeys) {
  const ar = ayahsUsed[key];
  const tr = newTranslations[key] || { en: "", bn: "" };
  // Use JSON.stringify to safely escape all special characters
  newCode += `  ${JSON.stringify(key)}: { ar: ${JSON.stringify(ar)}, en: ${JSON.stringify(tr.en)}, bn: ${JSON.stringify(tr.bn)} },\n`;
}
newCode += "};";

// Find the AYAHS constant by its type signature
const marker = 'const AYAHS: Record<string, { ar: string; en: string; bn: string }> = {';
const startIdx = tsx.indexOf(marker);
if (startIdx === -1) {
  console.error("ERROR: Could not find AYAHS constant");
  process.exit(1);
}

// Find the end: scan for `};` that closes this specific constant
// We need to track brace depth, but skip braces inside strings
let depth = 0;
let inString = false;
let stringChar = "";
let escaped = false;
let endIdx = -1;

for (let i = startIdx; i < tsx.length; i++) {
  const ch = tsx[i];

  if (escaped) {
    escaped = false;
    continue;
  }

  if (ch === "\\") {
    escaped = true;
    continue;
  }

  if (inString) {
    if (ch === stringChar) inString = false;
    continue;
  }

  if (ch === '"' || ch === "'" || ch === "`") {
    inString = true;
    stringChar = ch;
    continue;
  }

  if (ch === "{") depth++;
  if (ch === "}") {
    depth--;
    if (depth === 0) {
      endIdx = tsx[i + 1] === ";" ? i + 2 : i + 1;
      break;
    }
  }
}

if (endIdx === -1) {
  console.error("ERROR: Could not find AYAHS constant end");
  process.exit(1);
}

const oldLen = endIdx - startIdx;
console.log(`Found AYAHS at ${startIdx}..${endIdx} (${oldLen} chars)`);

tsx = tsx.slice(0, startIdx) + newCode + tsx.slice(endIdx);

await Bun.write("src/quranic-verbs.tsx", tsx);
const sizeKB = (new TextEncoder().encode(tsx).length / 1024).toFixed(1);
console.log(`✓ Updated AYAHS with Saheeh International (EN) + Abu Bakr Zakaria (BN)`);
console.log(`✓ Wrote src/quranic-verbs.tsx (${sizeKB} KB)`);
