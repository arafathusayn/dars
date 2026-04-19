/**
 * Master rebuild: generates the complete quranic-verbs.tsx from all data sources.
 *
 * Reads the original file for structure/components, then:
 * 1. Replaces the forms data with all 844 corpus-extracted forms
 * 2. Adds ex: [surah, ayah] to each form
 * 3. Inserts AYAHS map with Saheeh International + Abu Bakr Zakaria
 * 4. Updates imports, interface, translations
 * 5. Adds SURAH_NAMES, highlightWord, AyahModal, AyahRef
 * 6. Updates Quiz with category tabs
 * 7. Updates FormRow with ayah refs
 *
 * Run: bun scripts/rebuild-complete.ts
 */

// ── Load all data sources ───────────────────────────────────────────

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

const ayahRefs: Record<
  string,
  Record<string, { s: number; a: number; t: string }>
> = await Bun.file("scripts/ayah-refs.json").json();

const ayahsUsed: Record<string, string> = await Bun.file(
  "scripts/ayahs-used.json",
).json();

const ayahTranslations: Record<string, { en: string; bn: string }> =
  await Bun.file("scripts/ayah-translations-v2.json").json();

let tsx = await Bun.file("src/quranic-verbs.tsx").text();

// ── Step 1: Update imports ──────────────────────────────────────────

tsx = tsx.replace(
  'import { useState, useEffect, useMemo, useRef, createContext, useContext } from "react";',
  'import { useState, useEffect, useMemo, createContext, useContext } from "react";\nimport { createPortal } from "react-dom";',
);
console.log("✓ Imports");

// ── Step 2: Update VerbForm interface ───────────────────────────────

tsx = tsx.replace(
  `interface VerbForm {\n  ar: string;\n  tr: string;\n  ty: VerbType;\n  n: number;\n  mn: Record<Lang, string>;\n}`,
  `interface VerbForm {\n  ar: string;\n  tr: string;\n  ty: VerbType;\n  n: number;\n  mn: Record<Lang, string>;\n  ex: [number, number];\n}`,
);
console.log("✓ VerbForm interface");

// ── Step 3: Update translations ─────────────────────────────────────

tsx = tsx.replace(
  `noMatch: "No verbs match your search.", next: "Next →",`,
  `noMatch: "No verbs match your search.", next: "Next →", all: "All",`,
);
tsx = tsx.replace(
  `noMatch: "কোনো ক্রিয়াপদ পাওয়া যায়নি।", next: "পরবর্তী →",`,
  `noMatch: "কোনো ক্রিয়াপদ পাওয়া যায়নি।", next: "পরবর্তী →", all: "সব",`,
);
tsx = tsx.replace(`jussive: "মাজযূম"`, `jussive: "শর্তমূলক"`);
tsx = tsx.replace(`subjunctive: "মানসূব"`, `subjunctive: "সম্ভাব্য"`);
console.log("✓ Translations");

// ── Step 4: Generate AYAHS map ──────────────────────────────────────

const sortedAyahKeys = Object.keys(ayahsUsed).sort((a, b) => {
  const [sa, aa] = a.split(":").map(Number);
  const [sb, ab] = b.split(":").map(Number);
  return sa * 10000 + aa - (sb * 10000 + ab);
});

let ayahsCode =
  "\n// ── Ayah Texts (Saheeh International EN, Abu Bakr Zakaria BN) ────\n\n";
ayahsCode +=
  "const AYAHS: Record<string, { ar: string; en: string; bn: string }> = {\n";
for (const key of sortedAyahKeys) {
  const ar = ayahsUsed[key];
  const tr = ayahTranslations[key] || { en: "", bn: "" };
  ayahsCode += `  ${JSON.stringify(key)}: { ar: ${JSON.stringify(ar)}, en: ${JSON.stringify(tr.en)}, bn: ${JSON.stringify(tr.bn)} },\n`;
}
ayahsCode += "};\n";

tsx = tsx.replace("// ── Verb Data ──", ayahsCode + "\n// ── Verb Data ──");
console.log(`✓ AYAHS map (${sortedAyahKeys.length} entries)`);

// ── Step 5: Replace VERBS array with 844 forms + ex fields ─────────

// Extract verb metadata from original file
const verbMeta: {
  id: number;
  root: string;
  verb: string;
  tr: string;
  form: string;
  freq: number;
  color: string;
  mn: { en: string; bn: string };
}[] = [];
const metaRegex =
  /\{\s*\n?\s*id:\s*(\d+),\s*root:\s*"([^"]+)",\s*verb:\s*"([^"]+)",\s*tr:\s*"([^"]+)",\s*form:\s*"([^"]+)",\s*freq:\s*(\d+),\s*color:\s*"([^"]+)",\s*\n?\s*mn:\s*\{\s*en:\s*"([^"]+)",\s*bn:\s*"([^"]+)"\s*\}/g;
let match;
while ((match = metaRegex.exec(tsx)) !== null) {
  verbMeta.push({
    id: +match[1],
    root: match[2],
    verb: match[3],
    tr: match[4],
    form: match[5],
    freq: +match[6],
    color: match[7],
    mn: { en: match[8], bn: match[9] },
  });
}
console.log(`  Found ${verbMeta.length} verb metadata entries`);

// Build new VERBS array
let verbsCode = "const VERBS: Verb[] = [\n";
for (const v of verbMeta) {
  const forms = verbFormsFinal[String(v.id)] || [];
  const refs = ayahRefs[String(v.id)] || {};

  verbsCode += `  {\n`;
  verbsCode += `    id: ${v.id}, root: ${JSON.stringify(v.root)}, verb: ${JSON.stringify(v.verb)}, tr: ${JSON.stringify(v.tr)}, form: ${JSON.stringify(v.form)}, freq: ${v.freq}, color: ${JSON.stringify(v.color)},\n`;
  verbsCode += `    mn: { en: ${JSON.stringify(v.mn.en)}, bn: ${JSON.stringify(v.mn.bn)} },\n`;
  verbsCode += `    forms: [\n`;

  for (const f of forms) {
    // Look up ayah ref by normalized ar
    const ref = refs[f.ar];
    const ex: [number, number] = ref ? [ref.s, ref.a] : [0, 0];
    verbsCode += `      { ar: ${JSON.stringify(f.ar)}, tr: ${JSON.stringify(f.tr)}, ty: ${JSON.stringify(f.ty)}, n: ${f.n}, mn: { en: ${JSON.stringify(f.mn.en)}, bn: ${JSON.stringify(f.mn.bn)} }, ex: [${ex[0]}, ${ex[1]}] },\n`;
  }

  verbsCode += `    ],\n`;
  verbsCode += `  },\n`;
}
verbsCode += "];\n";

// Count forms added
let formCount = 0;
for (const v of verbMeta)
  formCount += (verbFormsFinal[String(v.id)] || []).length;
console.log(`✓ VERBS array with ${formCount} forms`);

// Replace old VERBS array
const verbsStart = tsx.indexOf("const VERBS: Verb[] = [");
if (verbsStart === -1) {
  console.error("Could not find VERBS array");
  process.exit(1);
}

// Find matching end bracket
let depth = 0;
let verbsEnd = -1;
let inStr = false;
let strCh = "";
let esc = false;
for (let i = verbsStart; i < tsx.length; i++) {
  const ch = tsx[i];
  if (esc) {
    esc = false;
    continue;
  }
  if (ch === "\\") {
    esc = true;
    continue;
  }
  if (inStr) {
    if (ch === strCh) inStr = false;
    continue;
  }
  if (ch === '"' || ch === "'" || ch === "`") {
    inStr = true;
    strCh = ch;
    continue;
  }
  if (ch === "[") depth++;
  if (ch === "]") {
    depth--;
    if (depth === 0) {
      verbsEnd = tsx[i + 1] === ";" ? i + 2 : i + 1;
      break;
    }
  }
}

tsx = tsx.slice(0, verbsStart) + verbsCode + tsx.slice(verbsEnd);

// ── Step 6: Replace buildQuizQuestions ───────────────────────────────

tsx = tsx.replace(
  `function buildQuizQuestions(verb: Verb, lang: Lang): QuizQuestion[] {
  return shuffle(verb.forms).map(form => {
    const correct = form.mn[lang];
    const distractors = shuffle(verb.forms.filter(f => f !== form))
      .slice(0, 3)
      .map(f => f.mn[lang]);
    return { form, correct, options: shuffle([correct, ...distractors]) };
  });
}`,
  `function buildQuizQuestions(verb: Verb, lang: Lang, typeFilter?: VerbType): QuizQuestion[] {
  const pool = typeFilter ? verb.forms.filter(f => f.ty === typeFilter) : verb.forms;
  if (pool.length < 2) return [];
  return shuffle(pool).map(form => {
    const correct = form.mn[lang];
    let candidates = pool.filter(f => f !== form);
    if (candidates.length < 3) {
      candidates = candidates.concat(verb.forms.filter(f => f !== form && !candidates.includes(f)));
    }
    const distractors = shuffle(candidates).slice(0, 3).map(f => f.mn[lang]);
    return { form, correct, options: shuffle([correct, ...distractors]) };
  });
}`,
);
console.log("✓ buildQuizQuestions with type filter");

// ── Step 7: Insert SURAH_NAMES + highlightWord + AyahModal + AyahRef before TypeBadge ──

const surahNamesCode = `
const SURAH_NAMES: Record<number, { en: string; ar: string }> = {
  1:{en:"Al-Fatihah",ar:"الفاتحة"},2:{en:"Al-Baqarah",ar:"البقرة"},3:{en:"Ali 'Imran",ar:"آل عمران"},
  4:{en:"An-Nisa",ar:"النساء"},5:{en:"Al-Ma'idah",ar:"المائدة"},6:{en:"Al-An'am",ar:"الأنعام"},
  7:{en:"Al-A'raf",ar:"الأعراف"},8:{en:"Al-Anfal",ar:"الأنفال"},9:{en:"At-Tawbah",ar:"التوبة"},
  10:{en:"Yunus",ar:"يونس"},11:{en:"Hud",ar:"هود"},12:{en:"Yusuf",ar:"يوسف"},
  13:{en:"Ar-Ra'd",ar:"الرعد"},14:{en:"Ibrahim",ar:"إبراهيم"},15:{en:"Al-Hijr",ar:"الحجر"},
  16:{en:"An-Nahl",ar:"النحل"},17:{en:"Al-Isra",ar:"الإسراء"},18:{en:"Al-Kahf",ar:"الكهف"},
  19:{en:"Maryam",ar:"مريم"},20:{en:"Taha",ar:"طه"},21:{en:"Al-Anbiya",ar:"الأنبياء"},
  22:{en:"Al-Hajj",ar:"الحج"},23:{en:"Al-Mu'minun",ar:"المؤمنون"},24:{en:"An-Nur",ar:"النور"},
  25:{en:"Al-Furqan",ar:"الفرقان"},26:{en:"Ash-Shu'ara",ar:"الشعراء"},27:{en:"An-Naml",ar:"النمل"},
  28:{en:"Al-Qasas",ar:"القصص"},29:{en:"Al-'Ankabut",ar:"العنكبوت"},30:{en:"Ar-Rum",ar:"الروم"},
  31:{en:"Luqman",ar:"لقمان"},32:{en:"As-Sajdah",ar:"السجدة"},33:{en:"Al-Ahzab",ar:"الأحزاب"},
  34:{en:"Saba",ar:"سبأ"},35:{en:"Fatir",ar:"فاطر"},36:{en:"Ya-Sin",ar:"يس"},
  37:{en:"As-Saffat",ar:"الصافات"},38:{en:"Sad",ar:"ص"},39:{en:"Az-Zumar",ar:"الزمر"},
  40:{en:"Ghafir",ar:"غافر"},41:{en:"Fussilat",ar:"فصلت"},42:{en:"Ash-Shuraa",ar:"الشورى"},
  43:{en:"Az-Zukhruf",ar:"الزخرف"},44:{en:"Ad-Dukhan",ar:"الدخان"},45:{en:"Al-Jathiyah",ar:"الجاثية"},
  46:{en:"Al-Ahqaf",ar:"الأحقاف"},47:{en:"Muhammad",ar:"محمد"},48:{en:"Al-Fath",ar:"الفتح"},
  49:{en:"Al-Hujurat",ar:"الحجرات"},50:{en:"Qaf",ar:"ق"},51:{en:"Adh-Dhariyat",ar:"الذاريات"},
  52:{en:"At-Tur",ar:"الطور"},53:{en:"An-Najm",ar:"النجم"},54:{en:"Al-Qamar",ar:"القمر"},
  55:{en:"Ar-Rahman",ar:"الرحمن"},56:{en:"Al-Waqi'ah",ar:"الواقعة"},57:{en:"Al-Hadid",ar:"الحديد"},
  58:{en:"Al-Mujadila",ar:"المجادلة"},59:{en:"Al-Hashr",ar:"الحشر"},60:{en:"Al-Mumtahanah",ar:"الممتحنة"},
  61:{en:"As-Saf",ar:"الصف"},62:{en:"Al-Jumu'ah",ar:"الجمعة"},63:{en:"Al-Munafiqun",ar:"المنافقون"},
  64:{en:"At-Taghabun",ar:"التغابن"},65:{en:"At-Talaq",ar:"الطلاق"},66:{en:"At-Tahrim",ar:"التحريم"},
  67:{en:"Al-Mulk",ar:"الملك"},68:{en:"Al-Qalam",ar:"القلم"},69:{en:"Al-Haqqah",ar:"الحاقة"},
  70:{en:"Al-Ma'arij",ar:"المعارج"},71:{en:"Nuh",ar:"نوح"},72:{en:"Al-Jinn",ar:"الجن"},
  73:{en:"Al-Muzzammil",ar:"المزمل"},74:{en:"Al-Muddaththir",ar:"المدثر"},75:{en:"Al-Qiyamah",ar:"القيامة"},
  76:{en:"Al-Insan",ar:"الإنسان"},77:{en:"Al-Mursalat",ar:"المرسلات"},78:{en:"An-Naba",ar:"النبأ"},
  79:{en:"An-Nazi'at",ar:"النازعات"},80:{en:"'Abasa",ar:"عبس"},81:{en:"At-Takwir",ar:"التكوير"},
  82:{en:"Al-Infitar",ar:"الانفطار"},83:{en:"Al-Mutaffifin",ar:"المطففين"},84:{en:"Al-Inshiqaq",ar:"الانشقاق"},
  85:{en:"Al-Buruj",ar:"البروج"},86:{en:"At-Tariq",ar:"الطارق"},87:{en:"Al-A'la",ar:"الأعلى"},
  88:{en:"Al-Ghashiyah",ar:"الغاشية"},89:{en:"Al-Fajr",ar:"الفجر"},90:{en:"Al-Balad",ar:"البلد"},
  91:{en:"Ash-Shams",ar:"الشمس"},92:{en:"Al-Layl",ar:"الليل"},93:{en:"Ad-Duhaa",ar:"الضحى"},
  94:{en:"Ash-Sharh",ar:"الشرح"},95:{en:"At-Tin",ar:"التين"},96:{en:"Al-'Alaq",ar:"العلق"},
  97:{en:"Al-Qadr",ar:"القدر"},98:{en:"Al-Bayyinah",ar:"البينة"},99:{en:"Az-Zalzalah",ar:"الزلزلة"},
  100:{en:"Al-'Adiyat",ar:"العاديات"},101:{en:"Al-Qari'ah",ar:"القارعة"},102:{en:"At-Takathur",ar:"التكاثر"},
  103:{en:"Al-'Asr",ar:"العصر"},104:{en:"Al-Humazah",ar:"الهمزة"},105:{en:"Al-Fil",ar:"الفيل"},
  106:{en:"Quraysh",ar:"قريش"},107:{en:"Al-Ma'un",ar:"الماعون"},108:{en:"Al-Kawthar",ar:"الكوثر"},
  109:{en:"Al-Kafirun",ar:"الكافرون"},110:{en:"An-Nasr",ar:"النصر"},111:{en:"Al-Masad",ar:"المسد"},
  112:{en:"Al-Ikhlas",ar:"الإخلاص"},113:{en:"Al-Falaq",ar:"الفلق"},114:{en:"An-Nas",ar:"الناس"},
};

function highlightWord(text: string, word: string): (string | React.ReactElement)[] {
  if (!word) return [text];
  const strip = (s: string) => s.replace(/[\\u064B-\\u065F\\u0670]/g, "");
  const plainText = strip(text);
  const plainWord = strip(word);
  const parts: (string | React.ReactElement)[] = [];
  let lastIdx = 0;
  let searchFrom = 0;
  while (searchFrom < plainText.length) {
    const idx = plainText.indexOf(plainWord, searchFrom);
    if (idx === -1) break;
    let origStart = 0, plainCount = 0;
    for (let i = 0; i < text.length && plainCount < idx; i++) {
      if (!/[\\u064B-\\u065F\\u0670]/.test(text[i])) plainCount++;
      origStart = i + 1;
    }
    let origEnd = origStart, pCount = 0;
    for (let i = origStart; i < text.length && pCount < plainWord.length; i++) {
      if (!/[\\u064B-\\u065F\\u0670]/.test(text[i])) pCount++;
      origEnd = i + 1;
    }
    if (origStart > lastIdx) parts.push(text.slice(lastIdx, origStart));
    parts.push(<span key={idx} style={{ color: "#a67c52", fontWeight: 700, background: "rgba(166,124,82,0.12)", borderRadius: 4, padding: "0 2px" }}>{text.slice(origStart, origEnd)}</span>);
    lastIdx = origEnd;
    searchFrom = idx + plainWord.length;
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx));
  return parts;
}

`;

// I can't write JSX in a string template in a Bun script — need to write actual code.
// Instead, output the code as escaped strings that don't contain JSX.
// The JSX components (AyahModal, AyahRef, Quiz tabs, FormRow) need to be applied via Edit tool.

tsx = tsx.replace(
  "const TypeBadge = ",
  surahNamesCode + "\nconst TypeBadge = ",
);
console.log("✓ SURAH_NAMES + highlightWord");

// ── Write ───────────────────────────────────────────────────────────

await Bun.write("src/quranic-verbs.tsx", tsx);
const sizeKB = (new TextEncoder().encode(tsx).length / 1024).toFixed(1);
console.log(`\n✓ Wrote src/quranic-verbs.tsx (${sizeKB} KB)`);
console.log(`\nRemaining code changes to apply via Edit tool:`);
console.log(`  - AyahModal component`);
console.log(`  - AyahRef component`);
console.log(`  - FormRow update (add AyahRef)`);
console.log(`  - Quiz category tabs`);
