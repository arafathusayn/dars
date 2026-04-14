/**
 * Finds the last Quranic occurrence (closest to end of Quran) of each
 * of the 844 verb forms, then fetches the ayah text from api.alquran.cloud.
 *
 * Outputs scripts/ayah-refs.json with the mapping:
 *   { [verbId]: { [normalizedArabicForm]: { s: surah, a: ayah, t: ayahText } } }
 *
 * Run: bun scripts/find-last-ayahs.ts
 */

const CORPUS_PATH = "src/data/quranic-corpus-morphology-0.4.txt";

// ── Buckwalter transliteration map ──────────────────────────────────

const BW: Record<string, string> = {
  "'": "\u0621", "|": "\u0622", ">": "\u0623", "&": "\u0624",
  "<": "\u0625", "}": "\u0626", "A": "\u0627", "b": "\u0628",
  "p": "\u0629", "t": "\u062A", "v": "\u062B", "j": "\u062C",
  "H": "\u062D", "x": "\u062E", "d": "\u062F", "*": "\u0630",
  "r": "\u0631", "z": "\u0632", "s": "\u0633", "$": "\u0634",
  "S": "\u0635", "D": "\u0636", "T": "\u0637", "Z": "\u0638",
  "E": "\u0639", "g": "\u063A", "_": "\u0640", "f": "\u0641",
  "q": "\u0642", "k": "\u0643", "l": "\u0644", "m": "\u0645",
  "n": "\u0646", "h": "\u0647", "w": "\u0648", "Y": "\u0649",
  "y": "\u064A", "F": "\u064B", "N": "\u064C", "K": "\u064D",
  "a": "\u064E", "u": "\u064F", "i": "\u0650", "~": "\u0651",
  "o": "\u0652", "`": "\u0670", "{": "\u0671", "^": "\u0653",
  "#": "\u0654", "@": "",
};

function bwToArabic(bw: string): string {
  let r = "";
  for (const ch of bw) r += BW[ch] ?? ch;
  return r;
}

/** Same normalization as buckwalter-to-arabic.ts used to build the 844 forms */
function normalize(ar: string): string {
  return ar.replace(/[\u0652\u0653\u0654]/g, "").replace(/\u0627$/, "");
}

// ── Verb definitions (same ROOT+LEM as extract-verb-forms.ts) ───────

const VERBS = [
  { id: 1, root: "qwl", lem: "qaAla" },
  { id: 2, root: "kwn", lem: "kaAna" },
  { id: 3, root: "Amn", lem: "'aAmana" },
  { id: 4, root: "Elm", lem: "Ealima" },
  { id: 5, root: "jEl", lem: "jaEala" },
  { id: 6, root: "kfr", lem: "kafara" },
  { id: 7, root: "jyA", lem: "jaA^'a" },
  { id: 8, root: "Eml", lem: "Eamila" },
  { id: 9, root: "Aty", lem: "A^taY" },
  { id: 10, root: "rAy", lem: "ra'aA" },
  { id: 11, root: "Aty", lem: ">ataY" },
  { id: 12, root: "$yA", lem: "$aA^'a" },
];

// ── Parse corpus ────────────────────────────────────────────────────

interface Segment { form: string; tag: string; features: string }

async function main() {
  console.log("Reading corpus...");
  const text = await Bun.file(CORPUS_PATH).text();
  const lines = text.split("\n");

  // Group segments by word location (chapter:verse:word)
  const words: { loc: string; segs: Segment[] }[] = [];
  let currentWordLoc = "";
  let currentSegs: Segment[] = [];

  for (const line of lines) {
    if (line.startsWith("#") || line.startsWith("LOCATION") || !line.trim()) continue;
    const [loc, form, tag, features] = line.split("\t");
    if (!loc || !form || !tag) continue;
    const wordLoc = loc.replace(/:\d+\)$/, ")");
    if (wordLoc !== currentWordLoc) {
      if (currentSegs.length) words.push({ loc: currentWordLoc, segs: currentSegs });
      currentWordLoc = wordLoc;
      currentSegs = [];
    }
    currentSegs.push({ form, tag, features: features || "" });
  }
  if (currentSegs.length) words.push({ loc: currentWordLoc, segs: currentSegs });

  console.log(`Parsed ${words.length} words from corpus`);

  // ── Find last occurrence of each form for each verb ─────────────

  // Map: verbId → { normalizedAr → { surah, ayah, sortKey } }
  const lastOccurrence: Record<number, Map<string, { s: number; a: number; key: number }>> = {};
  for (const v of VERBS) lastOccurrence[v.id] = new Map();

  for (const word of words) {
    for (const verb of VERBS) {
      const verbSeg = word.segs.find(
        (s) => s.tag === "V" &&
          s.features.includes(`ROOT:${verb.root}`) &&
          s.features.includes(`LEM:${verb.lem}`)
      );
      if (!verbSeg) continue;

      const fullTr = word.segs.map((s) => s.form).join("");
      const ar = bwToArabic(fullTr);
      const norm = normalize(ar);

      // Parse location: (chapter:verse:word)
      const m = word.loc.match(/\((\d+):(\d+):(\d+)\)/);
      if (!m) continue;
      const s = parseInt(m[1]);
      const a = parseInt(m[2]);
      const sortKey = s * 10000 + a; // higher = closer to end of Quran

      const existing = lastOccurrence[verb.id].get(norm);
      if (!existing || sortKey > existing.key) {
        lastOccurrence[verb.id].set(norm, { s, a, key: sortKey });
      }
    }
  }

  // Print summary
  let totalMatched = 0;
  for (const verb of VERBS) {
    const count = lastOccurrence[verb.id].size;
    totalMatched += count;
    console.log(`Verb ${verb.id} (${verb.root}): ${count} forms matched`);
  }
  console.log(`Total forms matched: ${totalMatched}`);

  // ── Collect unique surah:ayah references ──────────────────────────

  const refs = new Set<string>();
  for (const verb of VERBS) {
    for (const loc of lastOccurrence[verb.id].values()) {
      refs.add(`${loc.s}:${loc.a}`);
    }
  }
  console.log(`\nNeed ${refs.size} unique ayah texts`);

  // ── Fetch full Quran text from API ────────────────────────────────

  console.log("Fetching Quran text from api.alquran.cloud...");
  const resp = await fetch("https://api.alquran.cloud/v1/quran/quran-uthmani");
  if (!resp.ok) throw new Error(`API error: ${resp.status}`);
  const data = await resp.json();

  // Index ayahs: "surah:ayah" → text
  const ayahTexts = new Map<string, string>();
  for (const surah of data.data.surahs) {
    for (const ayah of surah.ayahs) {
      ayahTexts.set(`${surah.number}:${ayah.numberInSurah}`, ayah.text);
    }
  }
  console.log(`Indexed ${ayahTexts.size} ayahs`);

  // ── Build final output ────────────────────────────────────────────

  const result: Record<number, Record<string, { s: number; a: number; t: string }>> = {};

  for (const verb of VERBS) {
    result[verb.id] = {};
    for (const [norm, loc] of lastOccurrence[verb.id]) {
      const key = `${loc.s}:${loc.a}`;
      const text = ayahTexts.get(key) || "";
      result[verb.id][norm] = { s: loc.s, a: loc.a, t: text };
    }
  }

  // Write output
  await Bun.write("scripts/ayah-refs.json", JSON.stringify(result, null, 2));
  console.log("\nWrote scripts/ayah-refs.json");

  // Print sample
  console.log("\n=== Verb 1 (قَالَ) sample ===");
  const v1 = result[1];
  const entries = Object.entries(v1).slice(0, 5);
  for (const [form, ref] of entries) {
    console.log(`  ${form} → ${ref.s}:${ref.a} — ${ref.t.slice(0, 60)}...`);
  }

  // Also output a compact "unique ayahs" map for embedding
  const uniqueAyahs: Record<string, string> = {};
  for (const verb of VERBS) {
    for (const loc of Object.values(result[verb.id])) {
      const key = `${loc.s}:${loc.a}`;
      if (!uniqueAyahs[key]) uniqueAyahs[key] = loc.t;
    }
  }
  await Bun.write("scripts/ayah-texts.json", JSON.stringify(uniqueAyahs, null, 2));
  console.log(`\nWrote scripts/ayah-texts.json (${Object.keys(uniqueAyahs).length} unique ayahs)`);
}

main();
