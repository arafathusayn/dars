/**
 * Fetches Abu Bakr Muhammad Zakaria Bengali translation (ID 213)
 * from quran.com API for all 731 ayahs used in verb forms.
 *
 * quran.com API: /api/v4/quran/translations/213?verse_key=S:A
 * Batch endpoint: /api/v4/quran/translations/213?chapter_number=N
 *
 * Run: bun scripts/fetch-bn-zakariya.ts
 */

const ayahsUsed: Record<string, string> = await Bun.file(
  "scripts/ayahs-used.json",
).json();

const refs = Object.keys(ayahsUsed);
console.log(`Need translations for ${refs.length} ayahs`);

// Group refs by surah for efficient batch fetching
const bySurah = new Map<number, number[]>();
for (const ref of refs) {
  const [s, a] = ref.split(":").map(Number);
  if (!bySurah.has(s)) bySurah.set(s, []);
  bySurah.get(s)!.push(a);
}

console.log(`Spread across ${bySurah.size} surahs`);

// Fetch translations surah by surah
const translations = new Map<string, string>();
const surahs = [...bySurah.keys()].sort((a, b) => a - b);

for (const surahNum of surahs) {
  const url = `https://api.quran.com/api/v4/quran/translations/213?chapter_number=${surahNum}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    console.error(`Failed to fetch surah ${surahNum}: ${resp.status}`);
    continue;
  }
  const data = await resp.json();

  for (const tr of data.translations) {
    const key = tr.verse_key; // "S:A" format
    // Clean HTML tags from translation text
    let text = tr.text
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    translations.set(key, text);
  }

  // Rate limit: small delay between requests
  await new Promise((r) => setTimeout(r, 50));
}

console.log(`Fetched ${translations.size} translations`);

// Check coverage
let matched = 0;
for (const ref of refs) {
  if (translations.has(ref)) matched++;
  else console.warn(`  Missing: ${ref}`);
}
console.log(`Matched ${matched}/${refs.length}`);

// Write output
const result: Record<string, string> = {};
for (const ref of refs) {
  result[ref] = translations.get(ref) || "";
}

await Bun.write("scripts/bn-zakariya.json", JSON.stringify(result, null, 2));
console.log("Wrote scripts/bn-zakariya.json");

// Print samples
const samples = refs.slice(0, 3);
for (const ref of samples) {
  console.log(`\n${ref}: ${result[ref]?.slice(0, 100)}...`);
}
