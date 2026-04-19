/**
 * generate-verb-data.ts
 *
 * Reads verb-forms-arabic.json and generates English + Bengali meanings
 * for each conjugated form based on Buckwalter transliteration patterns.
 *
 * Usage: bun scripts/generate-verb-data.ts
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ── Types ──────────────────────────────────────────────────────────────────────

interface InputForm {
  ar: string;
  tr: string;
  roman: string;
  ty:
    | "perfect"
    | "imperfect"
    | "imperative"
    | "jussive"
    | "subjunctive"
    | "passive";
  n: number;
}

interface OutputForm {
  ar: string;
  tr: string; // romanized (from roman field)
  ty: string;
  n: number;
  mn: { en: string; bn: string };
}

type VerbData = Record<string, InputForm[]>;
type OutputData = Record<string, OutputForm[]>;

// ── Verb root definitions ──────────────────────────────────────────────────────

interface VerbDef {
  en: {
    base: string; // infinitive: "say"
    pastHe: string; // "said"
    pastShe: string; // "said"
    pastThey: string; // "said"
    pastWe: string; // "said"
    pastYouMS: string; // "said"
    pastYouP: string; // "said"
    pastI: string; // "said"
    presHe: string; // "says"
    presShe: string; // "says"
    presThey: string; // "say"
    presWe: string; // "say"
    presYouMS: string; // "say"
    presYouP: string; // "say"
    presI: string; // "say"
    impMS: string; // "say"
    impMP: string; // "say"
    impFS: string; // "say"
    impFP: string; // "say"
    impDual: string; // "say"
    passHe: string; // "was said"
    passThey: string; // "were said"
    passShe: string; // "was said"
  };
  bn: {
    pastHe: string;
    pastShe: string;
    pastThey: string;
    pastWe: string;
    pastYouMS: string;
    pastYouP: string;
    pastI: string;
    presHe: string;
    presShe: string;
    presThey: string;
    presWe: string;
    presYouMS: string;
    presYouP: string;
    presI: string;
    impMS: string;
    impMP: string;
    impFS: string;
    impFP: string;
    impDual: string;
    passHe: string;
    passThey: string;
    passShe: string;
  };
}

const VERB_DEFS: Record<string, VerbDef> = {
  "1": {
    // qwl - to say
    en: {
      base: "say",
      pastHe: "he said",
      pastShe: "she said",
      pastThey: "they said",
      pastWe: "we said",
      pastYouMS: "you said",
      pastYouP: "you (pl.) said",
      pastI: "I said",
      presHe: "he says",
      presShe: "she says",
      presThey: "they say",
      presWe: "we say",
      presYouMS: "you say",
      presYouP: "you (pl.) say",
      presI: "I say",
      impMS: "say!",
      impMP: "say! (pl.)",
      impFS: "say! (f.)",
      impFP: "say! (f.pl.)",
      impDual: "say! (dual)",
      passHe: "it was said",
      passThey: "it was said (pl.)",
      passShe: "it was said",
    },
    bn: {
      pastHe: "সে বলেছে",
      pastShe: "সে বলেছে",
      pastThey: "তারা বলেছে",
      pastWe: "আমরা বলেছি",
      pastYouMS: "তুমি বলেছ",
      pastYouP: "তোমরা বলেছ",
      pastI: "আমি বলেছি",
      presHe: "সে বলে",
      presShe: "সে বলে",
      presThey: "তারা বলে",
      presWe: "আমরা বলি",
      presYouMS: "তুমি বলো",
      presYouP: "তোমরা বলো",
      presI: "আমি বলি",
      impMS: "বলো!",
      impMP: "বলো!",
      impFS: "বলো!",
      impFP: "বলো!",
      impDual: "বলো!",
      passHe: "বলা হয়েছে",
      passThey: "বলা হয়েছে",
      passShe: "বলা হয়েছে",
    },
  },
  "2": {
    // kwn - to be
    en: {
      base: "be",
      pastHe: "he was",
      pastShe: "she was",
      pastThey: "they were",
      pastWe: "we were",
      pastYouMS: "you were",
      pastYouP: "you (pl.) were",
      pastI: "I was",
      presHe: "he is",
      presShe: "she is",
      presThey: "they are",
      presWe: "we are",
      presYouMS: "you are",
      presYouP: "you (pl.) are",
      presI: "I am",
      impMS: "be!",
      impMP: "be! (pl.)",
      impFS: "be! (f.)",
      impFP: "be! (f.pl.)",
      impDual: "be! (dual)",
      passHe: "it was",
      passThey: "they were",
      passShe: "she was",
    },
    bn: {
      pastHe: "সে ছিল",
      pastShe: "সে ছিল",
      pastThey: "তারা ছিল",
      pastWe: "আমরা ছিলাম",
      pastYouMS: "তুমি ছিলে",
      pastYouP: "তোমরা ছিলে",
      pastI: "আমি ছিলাম",
      presHe: "সে হয়",
      presShe: "সে হয়",
      presThey: "তারা হয়",
      presWe: "আমরা হই",
      presYouMS: "তুমি হও",
      presYouP: "তোমরা হও",
      presI: "আমি হই",
      impMS: "হও!",
      impMP: "হও!",
      impFS: "হও!",
      impFP: "হও!",
      impDual: "হও!",
      passHe: "হয়েছে",
      passThey: "হয়েছে",
      passShe: "হয়েছে",
    },
  },
  "3": {
    // Amn - to believe (Form IV: آمَنَ)
    en: {
      base: "believe",
      pastHe: "he believed",
      pastShe: "she believed",
      pastThey: "they believed",
      pastWe: "we believed",
      pastYouMS: "you believed",
      pastYouP: "you (pl.) believed",
      pastI: "I believed",
      presHe: "he believes",
      presShe: "she believes",
      presThey: "they believe",
      presWe: "we believe",
      presYouMS: "you believe",
      presYouP: "you (pl.) believe",
      presI: "I believe",
      impMS: "believe!",
      impMP: "believe! (pl.)",
      impFS: "believe! (f.)",
      impFP: "believe! (f.pl.)",
      impDual: "believe! (dual)",
      passHe: "it was believed",
      passThey: "they were believed",
      passShe: "she was believed",
    },
    bn: {
      pastHe: "সে ঈমান এনেছে",
      pastShe: "সে ঈমান এনেছে",
      pastThey: "তারা ঈমান এনেছে",
      pastWe: "আমরা ঈমান এনেছি",
      pastYouMS: "তুমি ঈমান এনেছ",
      pastYouP: "তোমরা ঈমান এনেছ",
      pastI: "আমি ঈমান এনেছি",
      presHe: "সে ঈমান আনে",
      presShe: "সে ঈমান আনে",
      presThey: "তারা ঈমান আনে",
      presWe: "আমরা ঈমান আনি",
      presYouMS: "তুমি ঈমান আনো",
      presYouP: "তোমরা ঈমান আনো",
      presI: "আমি ঈমান আনি",
      impMS: "ঈমান আনো!",
      impMP: "ঈমান আনো!",
      impFS: "ঈমান আনো!",
      impFP: "ঈমান আনো!",
      impDual: "ঈমান আনো!",
      passHe: "ঈমান আনা হয়েছে",
      passThey: "ঈমান আনা হয়েছে",
      passShe: "ঈমান আনা হয়েছে",
    },
  },
  "4": {
    // Elm - to know
    en: {
      base: "know",
      pastHe: "he knew",
      pastShe: "she knew",
      pastThey: "they knew",
      pastWe: "we knew",
      pastYouMS: "you knew",
      pastYouP: "you (pl.) knew",
      pastI: "I knew",
      presHe: "he knows",
      presShe: "she knows",
      presThey: "they know",
      presWe: "we know",
      presYouMS: "you know",
      presYouP: "you (pl.) know",
      presI: "I know",
      impMS: "know!",
      impMP: "know! (pl.)",
      impFS: "know! (f.)",
      impFP: "know! (f.pl.)",
      impDual: "know! (dual)",
      passHe: "it was known",
      passThey: "they were known",
      passShe: "she was known",
    },
    bn: {
      pastHe: "সে জেনেছে",
      pastShe: "সে জেনেছে",
      pastThey: "তারা জেনেছে",
      pastWe: "আমরা জেনেছি",
      pastYouMS: "তুমি জেনেছ",
      pastYouP: "তোমরা জেনেছ",
      pastI: "আমি জেনেছি",
      presHe: "সে জানে",
      presShe: "সে জানে",
      presThey: "তারা জানে",
      presWe: "আমরা জানি",
      presYouMS: "তুমি জানো",
      presYouP: "তোমরা জানো",
      presI: "আমি জানি",
      impMS: "জেনে নাও!",
      impMP: "জেনে নাও!",
      impFS: "জেনে নাও!",
      impFP: "জেনে নাও!",
      impDual: "জেনে নাও!",
      passHe: "জানা হয়েছে",
      passThey: "জানা হয়েছে",
      passShe: "জানা হয়েছে",
    },
  },
  "5": {
    // jEl - to make/appoint
    en: {
      base: "make",
      pastHe: "he made",
      pastShe: "she made",
      pastThey: "they made",
      pastWe: "we made",
      pastYouMS: "you made",
      pastYouP: "you (pl.) made",
      pastI: "I made",
      presHe: "he makes",
      presShe: "she makes",
      presThey: "they make",
      presWe: "we make",
      presYouMS: "you make",
      presYouP: "you (pl.) make",
      presI: "I make",
      impMS: "make!",
      impMP: "make! (pl.)",
      impFS: "make! (f.)",
      impFP: "make! (f.pl.)",
      impDual: "make! (dual)",
      passHe: "it was made",
      passThey: "they were made",
      passShe: "she was made",
    },
    bn: {
      pastHe: "সে বানিয়েছে",
      pastShe: "সে বানিয়েছে",
      pastThey: "তারা বানিয়েছে",
      pastWe: "আমরা বানিয়েছি",
      pastYouMS: "তুমি বানিয়েছ",
      pastYouP: "তোমরা বানিয়েছ",
      pastI: "আমি বানিয়েছি",
      presHe: "সে বানায়",
      presShe: "সে বানায়",
      presThey: "তারা বানায়",
      presWe: "আমরা বানাই",
      presYouMS: "তুমি বানাও",
      presYouP: "তোমরা বানাও",
      presI: "আমি বানাই",
      impMS: "বানাও!",
      impMP: "বানাও!",
      impFS: "বানাও!",
      impFP: "বানাও!",
      impDual: "বানাও!",
      passHe: "বানানো হয়েছে",
      passThey: "বানানো হয়েছে",
      passShe: "বানানো হয়েছে",
    },
  },
  "6": {
    // kfr - to disbelieve
    en: {
      base: "disbelieve",
      pastHe: "he disbelieved",
      pastShe: "she disbelieved",
      pastThey: "they disbelieved",
      pastWe: "we disbelieved",
      pastYouMS: "you disbelieved",
      pastYouP: "you (pl.) disbelieved",
      pastI: "I disbelieved",
      presHe: "he disbelieves",
      presShe: "she disbelieves",
      presThey: "they disbelieve",
      presWe: "we disbelieve",
      presYouMS: "you disbelieve",
      presYouP: "you (pl.) disbelieve",
      presI: "I disbelieve",
      impMS: "disbelieve!",
      impMP: "disbelieve! (pl.)",
      impFS: "disbelieve! (f.)",
      impFP: "disbelieve! (f.pl.)",
      impDual: "disbelieve! (dual)",
      passHe: "it was disbelieved",
      passThey: "they were disbelieved",
      passShe: "she was disbelieved",
    },
    bn: {
      pastHe: "সে কুফরি করেছে",
      pastShe: "সে কুফরি করেছে",
      pastThey: "তারা কুফরি করেছে",
      pastWe: "আমরা কুফরি করেছি",
      pastYouMS: "তুমি কুফরি করেছ",
      pastYouP: "তোমরা কুফরি করেছ",
      pastI: "আমি কুফরি করেছি",
      presHe: "সে কুফরি করে",
      presShe: "সে কুফরি করে",
      presThey: "তারা কুফরি করে",
      presWe: "আমরা কুফরি করি",
      presYouMS: "তুমি কুফরি করো",
      presYouP: "তোমরা কুফরি করো",
      presI: "আমি কুফরি করি",
      impMS: "কুফরি করো না!",
      impMP: "কুফরি করো না!",
      impFS: "কুফরি করো না!",
      impFP: "কুফরি করো না!",
      impDual: "কুফরি করো না!",
      passHe: "কুফরি করা হয়েছে",
      passThey: "কুফরি করা হয়েছে",
      passShe: "কুফরি করা হয়েছে",
    },
  },
  "7": {
    // jyA - to come
    en: {
      base: "come",
      pastHe: "he came",
      pastShe: "she came",
      pastThey: "they came",
      pastWe: "we came",
      pastYouMS: "you came",
      pastYouP: "you (pl.) came",
      pastI: "I came",
      presHe: "he comes",
      presShe: "she comes",
      presThey: "they come",
      presWe: "we come",
      presYouMS: "you come",
      presYouP: "you (pl.) come",
      presI: "I come",
      impMS: "come!",
      impMP: "come! (pl.)",
      impFS: "come! (f.)",
      impFP: "come! (f.pl.)",
      impDual: "come! (dual)",
      passHe: "he was brought",
      passThey: "they were brought",
      passShe: "she was brought",
    },
    bn: {
      pastHe: "সে এসেছে",
      pastShe: "সে এসেছে",
      pastThey: "তারা এসেছে",
      pastWe: "আমরা এসেছি",
      pastYouMS: "তুমি এসেছ",
      pastYouP: "তোমরা এসেছ",
      pastI: "আমি এসেছি",
      presHe: "সে আসে",
      presShe: "সে আসে",
      presThey: "তারা আসে",
      presWe: "আমরা আসি",
      presYouMS: "তুমি আসো",
      presYouP: "তোমরা আসো",
      presI: "আমি আসি",
      impMS: "এসো!",
      impMP: "এসো!",
      impFS: "এসো!",
      impFP: "এসো!",
      impDual: "এসো!",
      passHe: "আনা হয়েছে",
      passThey: "আনা হয়েছে",
      passShe: "আনা হয়েছে",
    },
  },
  "8": {
    // Eml - to do/work
    en: {
      base: "do",
      pastHe: "he did",
      pastShe: "she did",
      pastThey: "they did",
      pastWe: "we did",
      pastYouMS: "you did",
      pastYouP: "you (pl.) did",
      pastI: "I did",
      presHe: "he does",
      presShe: "she does",
      presThey: "they do",
      presWe: "we do",
      presYouMS: "you do",
      presYouP: "you (pl.) do",
      presI: "I do",
      impMS: "do!",
      impMP: "do! (pl.)",
      impFS: "do! (f.)",
      impFP: "do! (f.pl.)",
      impDual: "do! (dual)",
      passHe: "it was done",
      passThey: "they were done",
      passShe: "she was done",
    },
    bn: {
      pastHe: "সে করেছে",
      pastShe: "সে করেছে",
      pastThey: "তারা করেছে",
      pastWe: "আমরা করেছি",
      pastYouMS: "তুমি করেছ",
      pastYouP: "তোমরা করেছ",
      pastI: "আমি করেছি",
      presHe: "সে করে",
      presShe: "সে করে",
      presThey: "তারা করে",
      presWe: "আমরা করি",
      presYouMS: "তুমি করো",
      presYouP: "তোমরা করো",
      presI: "আমি করি",
      impMS: "করো!",
      impMP: "করো!",
      impFS: "করো!",
      impFP: "করো!",
      impDual: "করো!",
      passHe: "করা হয়েছে",
      passThey: "করা হয়েছে",
      passShe: "করা হয়েছে",
    },
  },
  "9": {
    // Aty - to give (Form IV: آتى)
    en: {
      base: "give",
      pastHe: "he gave",
      pastShe: "she gave",
      pastThey: "they gave",
      pastWe: "we gave",
      pastYouMS: "you gave",
      pastYouP: "you (pl.) gave",
      pastI: "I gave",
      presHe: "he gives",
      presShe: "she gives",
      presThey: "they give",
      presWe: "we give",
      presYouMS: "you give",
      presYouP: "you (pl.) give",
      presI: "I give",
      impMS: "give!",
      impMP: "give! (pl.)",
      impFS: "give! (f.)",
      impFP: "give! (f.pl.)",
      impDual: "give! (dual)",
      passHe: "he was given",
      passThey: "they were given",
      passShe: "she was given",
    },
    bn: {
      pastHe: "সে দিয়েছে",
      pastShe: "সে দিয়েছে",
      pastThey: "তারা দিয়েছে",
      pastWe: "আমরা দিয়েছি",
      pastYouMS: "তুমি দিয়েছ",
      pastYouP: "তোমরা দিয়েছ",
      pastI: "আমি দিয়েছি",
      presHe: "সে দেয়",
      presShe: "সে দেয়",
      presThey: "তারা দেয়",
      presWe: "আমরা দিই",
      presYouMS: "তুমি দাও",
      presYouP: "তোমরা দাও",
      presI: "আমি দিই",
      impMS: "দাও!",
      impMP: "দাও!",
      impFS: "দাও!",
      impFP: "দাও!",
      impDual: "দাও!",
      passHe: "তাকে দেওয়া হয়েছে",
      passThey: "তাদের দেওয়া হয়েছে",
      passShe: "তাকে দেওয়া হয়েছে",
    },
  },
  "10": {
    // rAy - to see
    en: {
      base: "see",
      pastHe: "he saw",
      pastShe: "she saw",
      pastThey: "they saw",
      pastWe: "we saw",
      pastYouMS: "you saw",
      pastYouP: "you (pl.) saw",
      pastI: "I saw",
      presHe: "he sees",
      presShe: "she sees",
      presThey: "they see",
      presWe: "we see",
      presYouMS: "you see",
      presYouP: "you (pl.) see",
      presI: "I see",
      impMS: "see!",
      impMP: "see! (pl.)",
      impFS: "see! (f.)",
      impFP: "see! (f.pl.)",
      impDual: "see! (dual)",
      passHe: "it was seen",
      passThey: "they were seen",
      passShe: "she was seen",
    },
    bn: {
      pastHe: "সে দেখেছে",
      pastShe: "সে দেখেছে",
      pastThey: "তারা দেখেছে",
      pastWe: "আমরা দেখেছি",
      pastYouMS: "তুমি দেখেছ",
      pastYouP: "তোমরা দেখেছ",
      pastI: "আমি দেখেছি",
      presHe: "সে দেখে",
      presShe: "সে দেখে",
      presThey: "তারা দেখে",
      presWe: "আমরা দেখি",
      presYouMS: "তুমি দেখো",
      presYouP: "তোমরা দেখো",
      presI: "আমি দেখি",
      impMS: "দেখো!",
      impMP: "দেখো!",
      impFS: "দেখো!",
      impFP: "দেখো!",
      impDual: "দেখো!",
      passHe: "দেখা হয়েছে",
      passThey: "দেখা হয়েছে",
      passShe: "দেখা হয়েছে",
    },
  },
  "11": {
    // Aty - to come/bring (Form I: أتى)
    en: {
      base: "come",
      pastHe: "he came",
      pastShe: "she came",
      pastThey: "they came",
      pastWe: "we came",
      pastYouMS: "you came",
      pastYouP: "you (pl.) came",
      pastI: "I came",
      presHe: "he comes",
      presShe: "she comes",
      presThey: "they come",
      presWe: "we come",
      presYouMS: "you come",
      presYouP: "you (pl.) come",
      presI: "I come",
      impMS: "come!",
      impMP: "come! (pl.)",
      impFS: "come! (f.)",
      impFP: "come! (f.pl.)",
      impDual: "come! (dual)",
      passHe: "he was brought",
      passThey: "they were brought",
      passShe: "she was brought",
    },
    bn: {
      pastHe: "সে এসেছে",
      pastShe: "সে এসেছে",
      pastThey: "তারা এসেছে",
      pastWe: "আমরা এসেছি",
      pastYouMS: "তুমি এসেছ",
      pastYouP: "তোমরা এসেছ",
      pastI: "আমি এসেছি",
      presHe: "সে আসে",
      presShe: "সে আসে",
      presThey: "তারা আসে",
      presWe: "আমরা আসি",
      presYouMS: "তুমি আসো",
      presYouP: "তোমরা আসো",
      presI: "আমি আসি",
      impMS: "এসো!",
      impMP: "এসো!",
      impFS: "এসো!",
      impFP: "এসো!",
      impDual: "এসো!",
      passHe: "আনা হয়েছে",
      passThey: "আনা হয়েছে",
      passShe: "আনা হয়েছে",
    },
  },
  "12": {
    // $yA - to will/wish
    en: {
      base: "will",
      pastHe: "he willed",
      pastShe: "she willed",
      pastThey: "they willed",
      pastWe: "we willed",
      pastYouMS: "you willed",
      pastYouP: "you (pl.) willed",
      pastI: "I willed",
      presHe: "he wills",
      presShe: "she wills",
      presThey: "they will",
      presWe: "we will",
      presYouMS: "you will",
      presYouP: "you (pl.) will",
      presI: "I will",
      impMS: "will!",
      impMP: "will! (pl.)",
      impFS: "will! (f.)",
      impFP: "will! (f.pl.)",
      impDual: "will! (dual)",
      passHe: "it was willed",
      passThey: "they were willed",
      passShe: "she was willed",
    },
    bn: {
      pastHe: "সে চেয়েছে",
      pastShe: "সে চেয়েছে",
      pastThey: "তারা চেয়েছে",
      pastWe: "আমরা চেয়েছি",
      pastYouMS: "তুমি চেয়েছ",
      pastYouP: "তোমরা চেয়েছ",
      pastI: "আমি চেয়েছি",
      presHe: "সে চায়",
      presShe: "সে চায়",
      presThey: "তারা চায়",
      presWe: "আমরা চাই",
      presYouMS: "তুমি চাও",
      presYouP: "তোমরা চাও",
      presI: "আমি চাই",
      impMS: "চাও!",
      impMP: "চাও!",
      impFS: "চাও!",
      impFP: "চাও!",
      impDual: "চাও!",
      passHe: "চাওয়া হয়েছে",
      passThey: "চাওয়া হয়েছে",
      passShe: "চাওয়া হয়েছে",
    },
  },
};

// ── Prefix detection ───────────────────────────────────────────────────────────

interface PrefixInfo {
  /** Conjunction / particle prefixes found */
  prefixes: string[];
  /** The Buckwalter form after stripping prefixes */
  stem: string;
  /** English prefix string ("and ", "then ", "will ", etc.) */
  enPrefix: string;
  /** Bengali prefix string */
  bnPrefix: string;
}

/**
 * Strip leading conjunctions/particles from the Buckwalter tr.
 * Returns the prefixes found, the remaining stem, and the prefix translations.
 */
function stripPrefixes(tr: string): PrefixInfo {
  let stem = tr;
  const prefixes: string[] = [];
  const enParts: string[] = [];
  const bnParts: string[] = [];

  // Order matters: check multi-char prefixes first.
  // "fasa/fasaya" = then will
  // "wasa/wasaya" = and will
  // "sa/saya" = will
  // "la/li/liya" = emphasis / purpose
  // "wa" = and
  // "fa" = then/so
  // ">a" = interrogative prefix

  // Normalize leading gemination markers like "w~a", "l~a", "l~i", "n~a", "t~a"
  // These are the same letters with shadda
  stem = stem.replace(/^w~a/, "wa");
  stem = stem.replace(/^l~a/, "la");
  stem = stem.replace(/^l~i/, "li");
  stem = stem.replace(/^l~iya/, "liya");
  stem = stem.replace(/^l~aya/, "laya");
  stem = stem.replace(/^n~a/, "na");
  stem = stem.replace(/^n~u/, "nu");
  stem = stem.replace(/^f~a/, "fa");
  stem = stem.replace(/^t~a/, "ta");

  // Helper regex: matches the start of an imperfect verb stem (after all particles).
  // Covers ya-/ta-/na->a- (Form I) and yu&o-/tu&o-/nu&o- (Form IV) etc.
  const imperfectStartRe =
    /^[ytn]a|^[ytn]u|^[ytn]ajo|^[ytn]ako|^[>']a|^{|^nu|^ya|^ta|^na/;
  // Matches the start of a perfect/imperative stem
  const otherVerbStartRe =
    /^qa|^ku|^ka|^[>']a|^qul|^quw|^'aA|^>uw|^ji|^Ea|^ja|^$a|^ra/;

  // Interrogative >a- at the very start (e.g., >ataquwluwna, >afatu&ominuwna)
  if (/^>ata|^>afa|^>ana/.test(stem)) {
    prefixes.push(">a");
    enParts.push("do");
    bnParts.push("কি");
    stem = stem.slice(2); // remove ">a", leave "ta..." or "fa..." or "na..."
  }

  // "fa" = then/so
  if (stem.startsWith("fa") && !stem.startsWith("fa_#")) {
    const rest = stem.slice(2);
    if (
      imperfectStartRe.test(rest) ||
      otherVerbStartRe.test(rest) ||
      /^la|^sa|^lo/.test(rest)
    ) {
      prefixes.push("fa");
      enParts.push("then");
      bnParts.push("তারপর");
      stem = rest;
    }
  }

  // "wa" = and
  if (stem.startsWith("wa") && stem.length > 3) {
    const rest = stem.slice(2);
    if (
      imperfectStartRe.test(rest) ||
      otherVerbStartRe.test(rest) ||
      /^la|^sa|^li|^lo/.test(rest)
    ) {
      prefixes.push("wa");
      enParts.push("and");
      bnParts.push("এবং");
      stem = rest;
    }
  }

  // "sa" = will/soon (future particle before imperfect)
  if (/^sa[ytn>']/.test(stem) && !stem.startsWith("sa_#")) {
    prefixes.push("sa");
    enParts.push("will");
    bnParts.push("শীঘ্রই");
    stem = stem.slice(2); // remove "sa", leave "ya..."
  }

  // "la" = emphasis (before imperfect: layaquwlu, latu&ominun~a, lana...)
  if (stem.startsWith("la") && /^la[ytn>']/.test(stem)) {
    prefixes.push("la");
    enParts.push("surely");
    bnParts.push("অবশ্যই");
    stem = stem.slice(2);
  }

  // "li/lo" = purpose/lam al-amr (before jussive/subjunctive: liyu&ominuwA@, loyu&ominuwA@)
  if (/^li[ytn]/.test(stem) || /^lo[ytn]/.test(stem)) {
    prefixes.push("li");
    enParts.push("so that");
    bnParts.push("যাতে");
    stem = stem.slice(2); // remove "li"/"lo", leave "yu..."/"tu..."/"na..."
  }

  const enPrefix = enParts.length > 0 ? enParts.join(" ") + " " : "";
  const bnPrefix = bnParts.length > 0 ? bnParts.join(" ") + " " : "";

  return { prefixes, stem, enPrefix, bnPrefix };
}

// ── Person/number/gender detection ─────────────────────────────────────────────

type PersonKey =
  | "pastHe"
  | "pastShe"
  | "pastThey"
  | "pastWe"
  | "pastYouMS"
  | "pastYouP"
  | "pastI"
  | "presHe"
  | "presShe"
  | "presThey"
  | "presWe"
  | "presYouMS"
  | "presYouP"
  | "presI"
  | "impMS"
  | "impMP"
  | "impFS"
  | "impFP"
  | "impDual"
  | "passHe"
  | "passThey"
  | "passShe";

/**
 * Given the Buckwalter stem (after prefix stripping) and the verb type,
 * determine which person/number/gender key to use for looking up meanings.
 *
 * Imperfect prefix patterns across Arabic verb forms:
 *   Form I:  ya- / ta- / na- / >a-   (e.g. yaquwlu, taquwlu)
 *   Form IV: yu&o- / tu&o- / nu&o- / >a-  (e.g. yu&ominu, tu&ominu)
 *   Form I w/ hamza root: ya>o- / ta>o- / na>o-  (e.g. ya>otiY)
 *   Form I fa'ala: yajo- / tajo- / najo-  (e.g. yajoEalu)
 *   Other: yako- / tako- / nako-  (yakofuru, etc.)
 *
 * We detect the person marker by the FIRST letter: y=3rd, t=2nd/3rdF, n=1stP, >/a=1stS
 */
function detectPerson(stem: string, ty: string): PersonKey {
  // ── Passive voice ──
  if (ty === "passive") {
    if (/uwA@$|uwA\^?$|uw$/.test(stem)) return "passThey";
    if (/ato?$|ati$/.test(stem)) return "passShe";
    if (/tum$|tumo$/.test(stem)) return "passThey";
    return "passHe";
  }

  // ── Imperative ──
  if (ty === "imperative") {
    // Dual: -aA suffix (but not -naA)
    if (/aA\^?$/.test(stem) && !/naA$/.test(stem)) return "impDual";
    // Feminine singular: -iY / -iy suffix
    if (/iY\^?$/.test(stem) || /iy$/.test(stem)) return "impFS";
    // Masculine plural: -uwA@ / -uw^A@
    if (/uwA@$|uw\^A@$|uwA$/.test(stem)) return "impMP";
    // Feminine plural: -na suffix (rare)
    if (/na$/.test(stem) && !/naA$/.test(stem) && !/niY$/.test(stem))
      return "impFP";
    // Default: masculine singular
    return "impMS";
  }

  // ── Perfect ──
  if (ty === "perfect") {
    // 1st person singular: -tu / -otu
    if (/tu$|otu$/.test(stem)) return "pastI";
    // 1st person plural: -naA / -n~aA
    if (/naA$|n~aA$/.test(stem)) return "pastWe";
    // 2nd person masc. singular: -ta / -ota (but NOT -ato which is 3FS)
    if (
      (/ota$/.test(stem) || /[^a]ta$/.test(stem)) &&
      !/ato$/.test(stem) &&
      !/tumo$/.test(stem)
    )
      return "pastYouMS";
    // 2nd person plural: -tumo/-tum/-tumuA/-tumaA
    if (/tumo$|tum$|tumuA?$|tumaA$/.test(stem)) return "pastYouP";
    // 3rd person fem. singular: -at/-ato/-ati
    if (/ato$|ati$|at$/.test(stem)) return "pastShe";
    // 3rd person masc. plural: -uwA@/-uw
    if (/uwA@$|uwA\^?$|uw$|uw\^?$/.test(stem)) return "pastThey";
    // Dual (3rd): -aA (but not -naA)
    if (/aA$/.test(stem) && !/naA$/.test(stem)) return "pastThey";
    // Default 3MS
    return "pastHe";
  }

  // ── Imperfect / Jussive / Subjunctive ──
  // Detect the person marker by the FIRST character of the stem.
  // The imperfect prefix is always: [y/t/n/>/'/'a] + vowel(s)
  // After prefix stripping (wa-/fa-/la-/sa-), the stem starts with the person marker.

  const firstChar = stem[0];

  // Helper: check plural suffixes on the stem
  const hasMascPluralSuffix = /uwna$|uwn~a$|uwnana/.test(stem);
  const hasJussivePluralSuffix = /uwA@$|uw\^A@$/.test(stem);

  // 1st person singular: starts with > or ' (hamza) — >aquwlu, 'aAtiykum
  if (firstChar === ">" || firstChar === "'") {
    // Could also be >a- interrogative, but that's already stripped in prefix phase.
    // >anu&ominu is "1st singular I believe" pattern
    return "presI";
  }

  // 1st person plural: starts with n
  if (firstChar === "n") {
    return "presWe";
  }

  // 3rd person: starts with y
  if (firstChar === "y") {
    if (hasMascPluralSuffix) return "presThey";
    if (hasJussivePluralSuffix) return "presThey";
    // Feminine plural: -na suffix (not -uwna)
    if (/na$/.test(stem) && !hasMascPluralSuffix && !/aAna$/.test(stem))
      return "presThey";
    return "presHe";
  }

  // 2nd person or 3rd feminine: starts with t
  if (firstChar === "t") {
    if (hasMascPluralSuffix) return "presYouP";
    if (hasJussivePluralSuffix) return "presYouP";
    return "presYouMS";
  }

  // Fallback for imperfect/jussive/subjunctive
  if (ty === "imperfect" || ty === "subjunctive" || ty === "jussive") {
    return "presHe";
  }

  // Ultimate fallback
  return "pastHe";
}

// ── Strip object pronoun suffixes ──────────────────────────────────────────────

/**
 * Many forms in the data have object pronoun suffixes attached (him, them, you, etc.)
 * Strip them for person detection, and return the suffix meaning.
 */
function stripObjectSuffix(tr: string): {
  stem: string;
  enSuffix: string;
  bnSuffix: string;
} {
  // Order: longest match first
  const suffixes: [RegExp, string, string][] = [
    // -humO / -humu / -hum (them)
    [/[`]?humuw$/, " them", " তাদের"],
    [/[`]?humo$/, " them", " তাদের"],
    [/[`]?humu$/, " them", " তাদের"],
    [/[`]?hum$/, " them", " তাদের"],
    [/[`]?hun~a$/, " them (f.)", " তাদের"],
    // -kumo / -kumu / -kum (you pl.)
    [/[`]?kumuwhun~a$/, " them to you (pl.)", " তোমাদের তাদের"],
    [/[`]?kumo$/, " you (pl.)", " তোমাদের"],
    [/[`]?kumu$/, " you (pl.)", " তোমাদের"],
    [/[`]?kum$/, " you (pl.)", " তোমাদের"],
    // -hu / -hi (him/it)
    [/[`]?hu,$/, " him", " তাকে"],
    [/[`]?hu$/, " him", " তাকে"],
    [/[`]?hi$/, " him", " তাকে"],
    // -hA (her/it)
    [/[`]?haA$/, " it", " তা"],
    // -ka (you MS)
    [/[`]?ka$/, " you", " তোমাকে"],
    // -naA (us) - careful: this is also 1st person plural perfect ending
    // Only strip if preceded by a vowel + consonant pattern indicating suffix
    // We'll handle this case carefully in context
    // -niY (me)
    [/[`]?niY$/, " me", " আমাকে"],
    // -niy (me)
    [/[`]?niy$/, " me", " আমাকে"],
    // -naA as object suffix when it appears after certain patterns
    // e.g., jaA^'anaA (he came to us), but NOT qulonaA (we said)
  ];

  for (const [regex, enSuf, bnSuf] of suffixes) {
    if (regex.test(tr)) {
      const stripped = tr.replace(regex, "");
      // Verify the stripped form still looks like a valid verb form
      if (stripped.length >= 3) {
        return { stem: stripped, enSuffix: enSuf, bnSuffix: bnSuf };
      }
    }
  }

  return { stem: tr, enSuffix: "", bnSuffix: "" };
}

// ── Main processing ────────────────────────────────────────────────────────────

function generateMeaning(
  verbId: string,
  form: InputForm,
): { en: string; bn: string } {
  const def = VERB_DEFS[verbId];
  if (!def) {
    return { en: form.ty, bn: form.ty };
  }

  const tr = form.tr;
  const ty = form.ty;

  // 1. Strip conjunctive/particle prefixes
  const { enPrefix, bnPrefix, stem: afterPrefix } = stripPrefixes(tr);

  // 2. Strip object pronoun suffixes (for person detection)
  const { stem: bareStem, enSuffix, bnSuffix } = stripObjectSuffix(afterPrefix);

  // 3. Detect person/number/gender from the bare stem
  const personKey = detectPerson(bareStem, ty);

  // 4. Look up the meaning
  const en = def.en[personKey];
  const bn = def.bn[personKey];

  // 5. Compose final meaning with prefixes and suffixes
  const enMeaning = `${enPrefix}${en}${enSuffix}`;
  const bnMeaning = `${bnPrefix}${bn}${bnSuffix}`;

  return { en: enMeaning.trim(), bn: bnMeaning.trim() };
}

// ── Run ────────────────────────────────────────────────────────────────────────

const scriptDir = import.meta.dir;
const inputPath = join(scriptDir, "verb-forms-arabic.json");
const outputPath = join(scriptDir, "verb-forms-final.json");

console.log(`Reading ${inputPath}...`);
const inputData: VerbData = JSON.parse(readFileSync(inputPath, "utf-8"));

const output: OutputData = {};
let totalForms = 0;

for (const [verbId, forms] of Object.entries(inputData)) {
  output[verbId] = forms.map((form) => {
    totalForms++;
    const mn = generateMeaning(verbId, form);
    return {
      ar: form.ar,
      tr: form.roman, // Use romanized transliteration, NOT Buckwalter
      ty: form.ty,
      n: form.n,
      mn,
    };
  });
}

console.log(
  `Processed ${totalForms} forms across ${Object.keys(output).length} verbs.`,
);

// Write output
writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf-8");
console.log(`Written to ${outputPath}`);

// Print a sample from each verb for verification
for (const [verbId, forms] of Object.entries(output)) {
  console.log(`\n── Verb ${verbId} (${forms[0].ar}) ──`);
  for (const f of forms.slice(0, 5)) {
    console.log(
      `  ${f.ar.padEnd(15)} ${f.ty.padEnd(12)} ${f.mn.en.padEnd(30)} ${f.mn.bn}`,
    );
  }
  if (forms.length > 5) {
    console.log(`  ... and ${forms.length - 5} more forms`);
  }
}
