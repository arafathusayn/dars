/**
 * Fetches English translations for all unique ayahs used in the verb forms.
 * Uses api.alquran.cloud with the Sahih International translation.
 *
 * Outputs scripts/ayah-translations.json:
 *   { "surah:ayah": { en: "...", bn: "..." } }
 *
 * Run: bun scripts/fetch-ayah-translations.ts
 */

const ayahsUsed: Record<string, string> = await Bun.file(
  "scripts/ayahs-used.json",
).json();

const refs = Object.keys(ayahsUsed);
console.log(`Fetching translations for ${refs.length} ayahs...`);

// Fetch full Quran in English (Sahih International)
console.log("Fetching English translation...");
const enResp = await fetch("https://api.alquran.cloud/v1/quran/en.sahih");
if (!enResp.ok) throw new Error(`EN API error: ${enResp.status}`);
const enData = await enResp.json();

// Fetch full Quran in Bengali
console.log("Fetching Bengali translation...");
const bnResp = await fetch("https://api.alquran.cloud/v1/quran/bn.bengali");
if (!bnResp.ok) throw new Error(`BN API error: ${bnResp.status}`);
const bnData = await bnResp.json();

// Index translations
const enMap = new Map<string, string>();
const bnMap = new Map<string, string>();

for (const surah of enData.data.surahs) {
  for (const ayah of surah.ayahs) {
    enMap.set(`${surah.number}:${ayah.numberInSurah}`, ayah.text);
  }
}

for (const surah of bnData.data.surahs) {
  for (const ayah of surah.ayahs) {
    bnMap.set(`${surah.number}:${ayah.numberInSurah}`, ayah.text);
  }
}

console.log(`Indexed ${enMap.size} EN, ${bnMap.size} BN translations`);

// Build output — only for refs we need
const result: Record<string, { en: string; bn: string }> = {};
let matched = 0;

for (const ref of refs) {
  const en = enMap.get(ref) || "";
  const bn = bnMap.get(ref) || "";
  if (en) matched++;
  result[ref] = { en, bn };
}

console.log(`Matched ${matched}/${refs.length} translations`);

await Bun.write(
  "scripts/ayah-translations.json",
  JSON.stringify(result, null, 2),
);
console.log("Wrote scripts/ayah-translations.json");

// Print sample
const sample = Object.entries(result).slice(0, 3);
for (const [ref, tr] of sample) {
  console.log(`\n${ref}:`);
  console.log(`  EN: ${tr.en.slice(0, 80)}...`);
  console.log(`  BN: ${tr.bn.slice(0, 80)}...`);
}
