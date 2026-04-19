/**
 * Fetches translations from quran.com API:
 *   - English: Saheeh International (ID 20)
 *   - Bengali: Dr. Abu Bakr Muhammad Zakaria (ID 213)
 *
 * The API returns translations ordered by verse number within each surah.
 * We fetch surah-by-surah and map by index to verse number.
 *
 * Run: bun scripts/fetch-translations.ts
 */

const ayahsUsed: Record<string, string> = await Bun.file(
  "scripts/ayahs-used.json",
).json();

const refs = Object.keys(ayahsUsed);
console.log(`Need translations for ${refs.length} ayahs`);

// Group by surah and find which ayahs we need
const bySurah = new Map<number, Set<number>>();
for (const ref of refs) {
  const [s, a] = ref.split(":").map(Number);
  if (!bySurah.has(s)) bySurah.set(s, new Set());
  bySurah.get(s)!.add(a);
}

const surahs = [...bySurah.keys()].sort((a, b) => a - b);
console.log(`Spread across ${surahs.length} surahs`);

// We need to know how many ayahs per surah to map index → verse number
// Fetch surah info first
const surahInfoResp = await fetch("https://api.quran.com/api/v4/chapters");
const surahInfo = await surahInfoResp.json();
const surahAyahCount = new Map<number, number>();
for (const ch of surahInfo.chapters) {
  surahAyahCount.set(ch.id, ch.verses_count);
}

async function fetchTranslation(
  translationId: number,
  label: string,
): Promise<Map<string, string>> {
  const result = new Map<string, string>();

  for (const surahNum of surahs) {
    const url = `https://api.quran.com/api/v4/quran/translations/${translationId}?chapter_number=${surahNum}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      console.error(`  ${label}: Failed surah ${surahNum}: ${resp.status}`);
      continue;
    }
    const data = await resp.json();
    const translations: { text: string }[] = data.translations;

    // Translations are ordered by verse number (1, 2, 3, ...)
    const neededAyahs = bySurah.get(surahNum)!;
    for (let i = 0; i < translations.length; i++) {
      const ayahNum = i + 1;
      if (neededAyahs.has(ayahNum)) {
        // Strip HTML tags and footnote markers
        const text = translations[i].text
          .replace(/<[^>]+>/g, "")
          .replace(/\s+/g, " ")
          .trim();
        result.set(`${surahNum}:${ayahNum}`, text);
      }
    }

    // Rate limit
    await new Promise((r) => setTimeout(r, 30));
  }

  return result;
}

console.log("\nFetching English (Saheeh International, ID 20)...");
const enMap = await fetchTranslation(20, "EN");
console.log(`  Got ${enMap.size} translations`);

console.log("\nFetching Bengali (Abu Bakr Zakaria, ID 213)...");
const bnMap = await fetchTranslation(213, "BN");
console.log(`  Got ${bnMap.size} translations`);

// Check coverage
let enMissing = 0,
  bnMissing = 0;
for (const ref of refs) {
  if (!enMap.has(ref)) enMissing++;
  if (!bnMap.has(ref)) bnMissing++;
}
console.log(`\nEN missing: ${enMissing}, BN missing: ${bnMissing}`);

// Build combined output
const result: Record<string, { en: string; bn: string }> = {};
for (const ref of refs) {
  result[ref] = {
    en: enMap.get(ref) || "",
    bn: bnMap.get(ref) || "",
  };
}

await Bun.write(
  "scripts/ayah-translations-v2.json",
  JSON.stringify(result, null, 2),
);
console.log("Wrote scripts/ayah-translations-v2.json");

// Samples
for (const ref of ["114:1", "83:13", "2:26"]) {
  if (result[ref]) {
    console.log(`\n${ref}:`);
    console.log(`  EN: ${result[ref].en.slice(0, 100)}`);
    console.log(`  BN: ${result[ref].bn.slice(0, 100)}`);
  }
}
