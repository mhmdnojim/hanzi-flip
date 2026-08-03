// Importer for the "Sense Map + Reverse Index" workbook format.
//
// Layout expected (per workbook):
//   <HSKn>         main sheet: one row per Chinese word, one column trio per language
//   Sense Map      Sense ID | Source Row | Chinese | Pinyin | English Sense | Sense Status
//   Reverse Index  Language | Main Entry | Latin | English Meaning | Chinese | Pinyin |
//                  Sense ID | Mapping Class | Review Priority | Example Reference
//   Target Sense Map (optional)
//                  Language | Main Entry | Latin | Target Sense ID | Target Sense Gloss |
//                  Target Sense Note | Linked Sense IDs | Coverage
//
// One deck row = one SENSE, not one word: whichever language is put on the front,
// the card already is a clean one-meaning pair.
import * as XLSX from "xlsx";
import { VocabularyWord } from "@/types/vocabulary";
import { detectLanguageFromHeader, getLanguage, romanizationCodeFor } from "@/utils/languages";

export interface SenseImportResult {
  success: boolean;
  error?: string;
  filename: string;
  level?: string;
  words: VocabularyWord[];
  languages: string[];
  stats?: {
    sourceRows: number;
    senses: number;
    ambiguousSkipped: number;
    needsReview: number;
    reverseEntries: number;
    targetSenses: number;
    targetOnly: number;
  };
}

type Row = Record<string, string>;

const SENSE_SHEET = "sense map";
const REVERSE_SHEET = "reverse index";
const TARGET_SHEET = "target sense map";

const norm = (v: unknown) => String(v ?? "").trim();

/** Sense cells use "|" to separate the meanings that stayed together. */
const cleanSense = (v: unknown) =>
  norm(v)
    .replace(/^[|;,\s]+|[|;,\s]+$/g, "")
    .split(/\s*\|\s*/)
    .map((p) => p.trim())
    .filter(Boolean)
    .join(", ");

function findSheet(book: XLSX.WorkBook, name: string): string | undefined {
  return book.SheetNames.find((s) => s.trim().toLowerCase() === name);
}

/** Does this workbook use the Sense Map / Reverse Index format? */
export function isSenseWorkbook(book: XLSX.WorkBook): boolean {
  return Boolean(findSheet(book, SENSE_SHEET) && findSheet(book, REVERSE_SHEET));
}

function readSheet(book: XLSX.WorkBook, name: string): Row[] {
  return XLSX.utils.sheet_to_json<Row>(book.Sheets[name], { defval: "" });
}

/** Language name from the Reverse Index -> language code + its Latin code */
function codesForLanguage(name: string): { code: string | null; latin: string | null } {
  const code = detectLanguageFromHeader(name);
  if (!code || getLanguage(code).romanizationOf) return { code: null, latin: null };
  return { code, latin: romanizationCodeFor(code) };
}

export async function parseSenseWorkbook(file: File): Promise<SenseImportResult> {
  const filename = file.name.replace(/\.[^/.]+$/, "");
  const fail = (error: string): SenseImportResult => ({
    success: false,
    error,
    filename,
    words: [],
    languages: [],
  });

  let book: XLSX.WorkBook;
  try {
    book = XLSX.read(await file.arrayBuffer(), { type: "array" });
  } catch {
    return fail("Failed to read the Excel file.");
  }

  const senseName = findSheet(book, SENSE_SHEET);
  const reverseName = findSheet(book, REVERSE_SHEET);
  if (!senseName || !reverseName) return fail("No “Sense Map” / “Reverse Index” sheets found.");

  const senseRows = readSheet(book, senseName);
  const reverseRows = readSheet(book, reverseName);
  if (!senseRows.length) return fail("The “Sense Map” sheet is empty.");

  // ── Optional target-side sense map ────────────────────────────────────────
  // Gives every target-language word its own sense identity, so a target word
  // that carries several meanings still yields one clean card per meaning.
  interface TargetSense {
    code: string;
    latinCode: string | null;
    entry: string;
    latin: string;
    id: string;
    gloss: string;
    note: string;
    linked: string[];
  }
  const targetName = findSheet(book, TARGET_SHEET);
  const targetSenses: TargetSense[] = [];
  if (targetName) {
    for (const r of readSheet(book, targetName)) {
      const entry = cleanSense(r["Main Entry"]);
      const { code, latin } = codesForLanguage(norm(r["Language"]));
      if (!entry || !code) continue;
      const linked = norm(r["Linked Sense IDs"])
        .split(/\s*[|;,]\s*/)
        .map((s) => s.trim())
        .filter(Boolean);
      const coverage = norm(r["Coverage"]).toLowerCase();
      targetSenses.push({
        code,
        latinCode: latin,
        entry,
        latin: cleanSense(r["Latin"]),
        id: norm(r["Target Sense ID"]),
        gloss: cleanSense(r["Target Sense Gloss"]),
        note: norm(r["Target Sense Note"]),
        linked: coverage === "unlinked" ? [] : linked,
      });
    }
  }
  // Chinese Sense ID -> language code -> target senses attached to it
  const targetsBySense = new Map<string, Map<string, TargetSense[]>>();
  for (const t of targetSenses) {
    for (const senseId of t.linked) {
      const byLang = targetsBySense.get(senseId) ?? new Map<string, TargetSense[]>();
      const list = byLang.get(t.code) ?? [];
      list.push(t);
      byLang.set(t.code, list);
      targetsBySense.set(senseId, byLang);
    }
  }

  // Main vocabulary sheet: first sheet that isn't one of the meta sheets.
  const meta = new Set([senseName, reverseName, ...book.SheetNames.filter((s) => /^sources$/i.test(s.trim()))]);
  const mainName = book.SheetNames.find((s) => !meta.has(s));
  const mainRows = mainName ? readSheet(book, mainName) : [];
  const mainHeaders = mainRows.length ? Object.keys(mainRows[0]).filter((h) => h && !h.startsWith("__EMPTY")) : [];
  // Excel row number (as used by "Source Row") -> sheet row. Row 1 is the header.
  const mainByRow = new Map<number, Row>();
  mainRows.forEach((row, i) => mainByRow.set(i + 2, row));

  // "<Language> Examples" columns on the main sheet
  const exampleCols: { header: string; code: string | null }[] = mainHeaders
    .filter((h) => /examples?$/i.test(h.trim()))
    .map((h) => ({ header: h, code: detectLanguageFromHeader(h.replace(/examples?$/i, "").trim()) }));

  // ── Reverse Index grouped by Sense ID ─────────────────────────────────────
  interface Entry {
    language: string;
    entry: string;
    latin: string;
    english: string;
    mapping: string;
    priority: string;
  }
  const bySense = new Map<string, Entry[]>();
  for (const r of reverseRows) {
    const senseId = norm(r["Sense ID"]);
    const entry = norm(r["Main Entry"]);
    if (!senseId || !entry) continue;
    const list = bySense.get(senseId) ?? [];
    list.push({
      language: norm(r["Language"]),
      entry,
      latin: norm(r["Latin"]),
      english: norm(r["English Meaning"]),
      mapping: norm(r["Mapping Class"]),
      priority: norm(r["Review Priority"]),
    });
    bySense.set(senseId, list);
  }

  // ── Which senses are real cards? ──────────────────────────────────────────
  // "S00" rows hold the ambiguous, still-combined source meaning. They are only
  // used when the word has no split senses at all.
  const sensesByRow = new Map<number, Row[]>();
  for (const s of senseRows) {
    const source = Number(s["Source Row"]);
    if (!Number.isFinite(source)) continue;
    const list = sensesByRow.get(source) ?? [];
    list.push(s);
    sensesByRow.set(source, list);
  }

  const languages = new Set<string>();
  const words: VocabularyWord[] = [];
  const stamp = Date.now();
  let ambiguousSkipped = 0;
  let needsReview = 0;

  for (const [sourceRow, group] of [...sensesByRow.entries()].sort((a, b) => a[0] - b[0])) {
    const split = group.filter((s) => !/-S00$/i.test(norm(s["Sense ID"])));
    const useable = split.length ? split : group;
    ambiguousSkipped += group.length - useable.length;

    for (const sense of useable) {
      const senseId = norm(sense["Sense ID"]);
      const chinese = norm(sense["Chinese"]);
      const pinyin = norm(sense["Pinyin"]);
      const english = cleanSense(sense["English Sense"]);
      if (!chinese && !english) continue;

      const values: Record<string, string> = {};
      if (chinese) {
        values["zh"] = chinese;
        languages.add("zh");
      }
      if (pinyin) {
        values["zh-pinyin"] = pinyin;
        languages.add("zh-pinyin");
      }
      if (english) {
        values["en"] = english;
        languages.add("en");
      }

      // Merge every reverse-index entry for this sense, per language.
      const perLanguage = new Map<string, { entries: string[]; latins: string[] }>();
      let review = false;
      for (const e of bySense.get(senseId) ?? []) {
        const { code, latin } = codesForLanguage(e.language);
        if (!code) continue;
        const bucket = perLanguage.get(code) ?? { entries: [], latins: [] };
        const entry = cleanSense(e.entry);
        if (entry && !bucket.entries.includes(entry)) {
          bucket.entries.push(entry);
          bucket.latins.push(cleanSense(e.latin));
        }
        perLanguage.set(code, bucket);
        if (/needs review/i.test(e.mapping) || /high/i.test(e.priority)) review = true;
        languages.add(code);
      }
      for (const [code, bucket] of perLanguage) {
        const text = bucket.entries.join(", ");
        values[code] = text;
        const latin = romanizationCodeFor(code);
        const latinText = bucket.latins.join(", ").trim();
        // Latin-script languages transliterate to themselves — no second line needed.
        if (latin && latinText.replace(/[,\s]/g, "") && latinText !== text) {
          values[latin] = latinText;
          languages.add(latin);
        }
      }

      // Target-side senses win over the plain reverse-index merge: they know which
      // meaning of the target word this card is about.
      const senseNotes: Record<string, string> = {};
      for (const [code, list] of targetsBySense.get(senseId) ?? []) {
        const entries: string[] = [];
        const latins: string[] = [];
        const notes: string[] = [];
        for (const t of list) {
          if (t.entry && !entries.includes(t.entry)) {
            entries.push(t.entry);
            latins.push(t.latin);
            if (t.note || t.gloss) notes.push(t.note || t.gloss);
          }
        }
        if (!entries.length) continue;
        const text = entries.join(", ");
        values[code] = text;
        languages.add(code);
        const latinCode = list[0].latinCode;
        const latinText = latins.join(", ").trim();
        if (latinCode && latinText.replace(/[,\s]/g, "") && latinText !== text) {
          values[latinCode] = latinText;
          languages.add(latinCode);
        }
        const note = [...new Set(notes)].join("; ");
        if (note) senseNotes[code] = note;
      }

      if (Object.keys(values).length === 0) continue;
      if (review) needsReview += 1;

      const source = mainByRow.get(sourceRow);
      const extraColumns: Record<string, string> = { "Sense ID": senseId };
      const status = norm(sense["Sense Status"]);
      if (status) extraColumns["Sense Status"] = status;
      if (review) extraColumns["Review"] = "Needs review";
      let exampleSentence: string | undefined;
      if (source) {
        for (const { header, code } of exampleCols) {
          const text = norm(source[header]);
          if (!text) continue;
          extraColumns[header] = text;
          if (!exampleSentence && code === "zh") exampleSentence = text.split(/\r?\n/)[0];
        }
      }

      words.push({
        id: `sense_${stamp}_${senseId}`,
        values,
        chinese: values["zh"] || english,
        pinyin: values["zh-pinyin"] || "",
        english,
        exampleSentence,
        extraColumns,
        senseNotes: Object.keys(senseNotes).length ? senseNotes : undefined,
        favorite: false,
        correctCount: 0,
        incorrectCount: 0,
      });
    }
  }

  // ── Target-only senses ────────────────────────────────────────────────────
  // Meanings of a target word with no counterpart in the source vocabulary: kept
  // as cards with an empty source side so they stay visible and filterable.
  let targetOnly = 0;
  for (const t of targetSenses) {
    if (t.linked.length) continue;
    const values: Record<string, string> = { [t.code]: t.entry };
    languages.add(t.code);
    if (t.latinCode && t.latin && t.latin !== t.entry) {
      values[t.latinCode] = t.latin;
      languages.add(t.latinCode);
    }
    if (t.gloss) {
      values["en"] = t.gloss;
      languages.add("en");
    }
    targetOnly += 1;
    words.push({
      id: `target_${stamp}_${t.id || `${t.code}_${targetOnly}`}`,
      values,
      chinese: t.entry,
      pinyin: t.latin,
      english: t.gloss,
      targetOnly: true,
      senseNotes: t.note ? { [t.code]: t.note } : undefined,
      extraColumns: {
        "Target Sense ID": t.id,
        "Target-only": "Yes",
        ...(t.note ? { "Sense Note": t.note } : {}),
      },
      favorite: false,
      correctCount: 0,
      incorrectCount: 0,
    });
  }

  if (!words.length) return fail("No senses could be built from this workbook.");

  const level = /HSK\s*\d/i.exec(norm(senseRows[0]["Sense ID"]) || filename)?.[0]?.toUpperCase();

  return {
    success: true,
    filename,
    level,
    words,
    languages: [...languages],
    stats: {
      sourceRows: sensesByRow.size,
      senses: words.length,
      ambiguousSkipped,
      needsReview,
      reverseEntries: reverseRows.length,
      targetSenses: targetSenses.length,
      targetOnly,
    },
  };
}
