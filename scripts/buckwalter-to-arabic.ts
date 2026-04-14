/**
 * Converts Buckwalter-encoded verb forms to Arabic script,
 * merges duplicates (same Arabic word), and produces the final
 * data for quranic-verbs.tsx.
 */

// Extended Buckwalter transliteration map (corpus variant)
const BW: Record<string, string> = {
  "'": "\u0621", // hamza ء
  "|": "\u0622", // alef madda آ
  ">": "\u0623", // alef hamza above أ
  "&": "\u0624", // waw hamza ؤ
  "<": "\u0625", // alef hamza below إ
  "}": "\u0626", // ya hamza ئ
  "A": "\u0627", // alef ا
  "b": "\u0628", // ba ب
  "p": "\u0629", // ta marbuta ة
  "t": "\u062A", // ta ت
  "v": "\u062B", // tha ث
  "j": "\u062C", // jim ج
  "H": "\u062D", // ha ح
  "x": "\u062E", // kha خ
  "d": "\u062F", // dal د
  "*": "\u0630", // dhal ذ
  "r": "\u0631", // ra ر
  "z": "\u0632", // zay ز
  "s": "\u0633", // sin س
  "$": "\u0634", // shin ش
  "S": "\u0635", // sad ص
  "D": "\u0636", // dad ض
  "T": "\u0637", // ta ط
  "Z": "\u0638", // za ظ
  "E": "\u0639", // ain ع
  "g": "\u063A", // ghain غ
  "_": "\u0640", // tatweel ـ
  "f": "\u0641", // fa ف
  "q": "\u0642", // qaf ق
  "k": "\u0643", // kaf ك
  "l": "\u0644", // lam ل
  "m": "\u0645", // mim م
  "n": "\u0646", // nun ن
  "h": "\u0647", // ha ه
  "w": "\u0648", // waw و
  "Y": "\u0649", // alef maqsura ى
  "y": "\u064A", // ya ي
  "F": "\u064B", // fathatan ً
  "N": "\u064C", // dammatan ٌ
  "K": "\u064D", // kasratan ٍ
  "a": "\u064E", // fatha َ
  "u": "\u064F", // damma ُ
  "i": "\u0650", // kasra ِ
  "~": "\u0651", // shadda ّ
  "o": "\u0652", // sukun ْ
  "`": "\u0670", // superscript alef ٰ
  "{": "\u0671", // alef wasla ٱ
  "^": "\u0653", // maddah ٓ
  "#": "\u0654", // hamza above ٔ
  "@": "",        // end-of-word marker (silent)
};

function buckwalterToArabic(bw: string): string {
  let result = "";
  for (const ch of bw) {
    result += BW[ch] ?? ch;
  }
  return result;
}

// Standard romanization for display (simplified)
function buckwalterToRoman(bw: string): string {
  // Remove diacritics and markers, produce a readable romanization
  const map: Record<string, string> = {
    "'": "ʾ", "|": "ā", ">": "ʾa", "&": "ʾu", "<": "ʾi", "}": "ʾ",
    "A": "ā", "b": "b", "p": "h", "t": "t", "v": "th", "j": "j",
    "H": "ḥ", "x": "kh", "d": "d", "*": "dh", "r": "r", "z": "z",
    "s": "s", "$": "sh", "S": "ṣ", "D": "ḍ", "T": "ṭ", "Z": "ẓ",
    "E": "ʿ", "g": "gh", "f": "f", "q": "q", "k": "k", "l": "l",
    "m": "m", "n": "n", "h": "h", "w": "w", "Y": "ā", "y": "y",
    "a": "a", "u": "u", "i": "i", "~": "", "o": "", "`": "ā",
    "{": "", "^": "", "#": "", "@": "", "F": "an", "N": "un", "K": "in",
    "_": "",
  };
  let result = "";
  for (const ch of bw) {
    result += map[ch] ?? ch;
  }
  // Clean up common patterns
  return result
    .replace(/aā/g, "ā")
    .replace(/uw/g, "ū")
    .replace(/iy/g, "ī")
    .replace(/aa/g, "ā");
}

interface RawForm {
  tr: string;
  ty: string;
  n: number;
}

async function main() {
  const raw: Record<string, RawForm[]> = await Bun.file("scripts/verb-forms-raw.json").json();

  const results: Record<string, { ar: string; tr: string; roman: string; ty: string; n: number }[]> = {};

  for (const [verbId, forms] of Object.entries(raw)) {
    // Convert and merge — normalize Arabic by stripping maddah (U+0653) and sukun (U+0652) differences
    const merged = new Map<string, { ar: string; tr: string; roman: string; ty: string; n: number }>();

    for (const form of forms) {
      const ar = buckwalterToArabic(form.tr);
      // Normalize: remove maddah ٓ (U+0653), hamza above ٔ (U+0654), sukun ْ (U+0652),
      // and trailing alef (ا after وا in verbs) to collapse identical base forms
      const key = ar.replace(/[\u0652\u0653\u0654]/g, "").replace(/\u0627$/, "");
      if (merged.has(key)) {
        merged.get(key)!.n += form.n;
      } else {
        merged.set(key, {
          ar: key,
          tr: form.tr,
          roman: buckwalterToRoman(form.tr),
          ty: form.ty,
          n: form.n,
        });
      }
    }

    results[verbId] = [...merged.values()].sort((a, b) => b.n - a.n);
  }

  // Print summary
  for (const [id, forms] of Object.entries(results)) {
    const total = forms.reduce((s, f) => s + f.n, 0);
    console.log(`Verb ${id}: ${forms.length} unique Arabic forms, ${total} total`);
  }

  await Bun.write("scripts/verb-forms-arabic.json", JSON.stringify(results, null, 2));
  console.log("\nWrote scripts/verb-forms-arabic.json");

  // Also print first verb's forms for inspection
  console.log("\n=== Verb 1 (قَالَ) sample ===");
  for (const f of results["1"].slice(0, 15)) {
    console.log(`  ${f.ar}\t${f.roman}\t${f.ty}\t${f.n}`);
  }
}

main();
