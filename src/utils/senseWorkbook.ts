// Importer for the language-neutral "Concept / Lexeme / Target Sense" workbook format.
//
// Sheets (per workbook):
//   <HSKn>            main study sheet (one row per Chinese word, examples per language)
//   Sense Map         Sense ID | Source Row | Chinese | Pinyin | English Sense | Sense Status
//                     | Concept ID | Chinese Lexeme ID | Chinese Target Sense ID | Needs Review
//   Reverse Index[ n] Language | Main Entry | Latin | English Meaning | Chinese | Pinyin |
//                     Sense ID | Mapping Class | Review Priority | Example Reference
//                     | Lexeme ID | Target Sense ID | Concept ID | Needs Review
//   Concepts          Concept ID | English Definition | ... | Display Default | Needs Review
//   Polysemy Index    Lexeme ID | Language | Headword | Latin | Dataset Sense Count | ...
//   Unanchored Senses verified target-language meanings absent from the HSK data
//   Target Sense Map  (legacy, still supported)
//
// Rule: never reverse the main vocabulary cells. Cards are built from the sense
// identifiers, so one card = one meaning whichever language sits on the front.
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
    concepts: number;
  };
}

type Row = Record<string, string>;

const SENSE_SHEET = "sense map";
const REVERSE_SHEET = "reverse index";
const TARGET_SHEET = "target sense map";
const CONCEPTS_SHEET = "concepts";
const POLYSEMY_SHEET = "polysemy index";
const UNANCHORED_SHEET = "unanchored senses";

const norm = (v: unknown) => String(v ?? "").trim();
const yes = (v: unknown) => /^(yes|y|true|1)$/i.test(norm(v));

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

/** Every "Reverse Index", "Reverse Index 2", "Reverse Index 3" … sheet (HSK6 is split by size) */
function findReverseSheets(book: XLSX.WorkBook): string[] {
  return book.SheetNames.filter((s) => /^reverse index(\s*\d+)?$/i.test(s.trim()));
}

/** Does this workbook use the sense-identifier format? */
export function isSenseWorkbook(book: XLSX.WorkBook): boolean {
  return Boolean(findSheet(book, SENSE_SHEET) && findReverseSheets(book).length);
}

function readSheet(book: XLSX.WorkBook, name: string): Row[] {
  return XLSX.utils.sheet_to_json<Row>(book.Sheets[name], { defval: "" });
}

/** Language name from the index sheets -> language code + its Latin code */
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
  const reverseNames = findReverseSheets(book);
  if (!senseName || !reverseNames.length) return fail("No “Sense Map” / “Reverse Index” sheets found.");

  const senseRows = readSheet(book, senseName);
  const reverseRows = reverseNames.flatMap((n) => readSheet(book, n));
  if (!senseRows.length) return fail("The “Sense Map” sheet is empty.");

  // ── Concepts: the language-neutral meaning table ──────────────────────────
  const conceptsName = findSheet(book, CONCEPTS_SHEET);
  const concepts = new Map<string, { definition: string; needsReview: boolean }>();
  if (conceptsName) {
    for (const r of readSheet(book, conceptsName)) {
      const id = norm(r["Concept ID"]);
      if (!id) continue;
      concepts.set(id, {
        definition: cleanSense(r["English Definition"]),
        needsReview: yes(r["Needs Review"]),
      });
    }
  }

  // ── Polysemy Index: how many HSK-linked meanings a lexeme has ─────────────
  const polysemyName = findSheet(book, POLYSEMY_SHEET);
  const polysemy = new Map<string, number>();
  if (polysemyName) {
    for (const r of readSheet(book, polysemyName)) {
      const id = norm(r["Lexeme ID"]);
      const count = Number(r["Dataset Sense Count"]);
      if (id && Number.isFinite(count)) polysemy.set(id, count);
    }
  }

  // ── Legacy target sense map (older workbooks) ─────────────────────────────
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
  const legacyTargets: TargetSense[] = [];
  if (targetName) {
    for (const r of readSheet(book, targetName)) {
      const entry = cleanSense(r["Main Entry"]);
      const { code, latin } = codesForLanguage(norm(r["Language"]));
      if (!entry || !code) continue;
      const coverage = norm(r["Coverage"]).toLowerCase();
      legacyTargets.push({
        code,
        latinCode: latin,
        entry,
        latin: cleanSense(r["Latin"]),
        id: norm(r["Target Sense ID"]),
        gloss: cleanSense(r["Target Sense Gloss"]),
        note: norm(r["Target Sense Note"]),
        linked:
          coverage === "unlinked"
            ? []
            : norm(r["Linked Sense IDs"])
                .split(/\s*[|;,]\s*/)
                .map((s) => s.trim())
                .filter(Boolean),
      });
    }
  }
  const legacyBySense = new Map<string, Map<string, TargetSense[]>>();
  for (const t of legacyTargets) {
    for (const senseId of t.linked) {
      const byLang = legacyBySense.get(senseId) ?? new Map<string, TargetSense[]>();
      const list = byLang.get(t.code) ?? [];
      list.push(t);
      byLang.set(t.code, list);
      legacyBySense.set(senseId, byLang);
    }
  }

  // Main vocabulary sheet: first sheet that isn't one of the meta sheets.
  const metaNames = new Set(
    [
      senseName,
      ...reverseNames,
      targetName,
      conceptsName,
      polysemyName,
      findSheet(book, UNANCHORED_SHEET),
      ...book.SheetNames.filter((s) => /^(sources|project guide|notes|readme)$/i.test(s.trim())),
    ].filter(Boolean) as string[]
  );
  const mainName = book.SheetNames.find((s) => !metaNames.has(s));
  const mainRows = mainName ? readSheet(book, mainName) : [];
  const mainHeaders = mainRows.length ? Object.keys(mainRows[0]).filter((h) => h && !h.startsWith("__EMPTY")) : [];
  const mainByRow = new Map<number, Row>();
  mainRows.forEach((row, i) => mainByRow.set(i + 2, row));

  const exampleCols: { header: string; code: string | null }[] = mainHeaders
    .filter((h) => /examples?$/i.test(h.trim()))
    .map((h) => ({ header: h, code: detectLanguageFromHeader(h.replace(/examples?$/i, "").trim()) }));

  // ── Reverse Index grouped by Concept ID (falling back to Sense ID) ────────
  interface Entry {
    code: string;
    latinCode: string | null;
    entry: string;
    latin: string;
    lexemeId: string;
    targetSenseId: string;
    gloss: string;
    review: boolean;
  }
  const bySense = new Map<string, Entry[]>();
  // Lexeme ID -> set of Target Sense IDs, used to number a word's meanings.
  const sensesPerLexeme = new Map<string, Set<string>>();
  const trackLexeme = (lexemeId: string, targetSenseId: string) => {
    if (!lexemeId) return;
    const set = sensesPerLexeme.get(lexemeId) ?? new Set<string>();
    set.add(targetSenseId || `#${set.size}`);
    sensesPerLexeme.set(lexemeId, set);
  };

  let reverseUsable = 0;
  for (const r of reverseRows) {
    const senseId = norm(r["Sense ID"]);
    const conceptId = norm(r["Concept ID"]) || (senseId ? `CP-${senseId}` : "");
    const entry = norm(r["Main Entry"]);
    if (!conceptId || !entry) continue;
    const { code, latin } = codesForLanguage(norm(r["Language"]));
    if (!code) continue;
    reverseUsable += 1;
    const lexemeId = norm(r["Lexeme ID"]);
    const targetSenseId = norm(r["Target Sense ID"]);
    trackLexeme(lexemeId, targetSenseId);
    const list = bySense.get(conceptId) ?? [];
    list.push({
      code,
      latinCode: latin,
      entry: cleanSense(entry),
      latin: cleanSense(r["Latin"]),
      lexemeId,
      targetSenseId,
      gloss: cleanSense(r["English Meaning"]),
      review:
        yes(r["Needs Review"]) ||
        /needs review/i.test(norm(r["Mapping Class"])) ||
        /high/i.test(norm(r["Review Priority"])),
    });
    bySense.set(conceptId, list);
  }

  // ── Sense Map grouped by source row ──────────────────────────────────────
  const sensesByRow = new Map<number, Row[]>();
  for (const s of senseRows) {
    const source = Number(s["Source Row"]);
    if (!Number.isFinite(source)) continue;
    const list = sensesByRow.get(source) ?? [];
    list.push(s);
    sensesByRow.set(source, list);
    trackLexeme(norm(s["Chinese Lexeme ID"]), norm(s["Chinese Target Sense ID"]));
  }

  const senseNumber = (lexemeId: string, targetSenseId: string) => {
    if (!lexemeId) return undefined;
    const set = sensesPerLexeme.get(lexemeId);
    if (!set) return undefined;
    const total = Math.max(polysemy.get(lexemeId) ?? 0, set.size);
    if (total < 2) return undefined;
    const index = [...set].indexOf(targetSenseId);
    return { index: index >= 0 ? index + 1 : 1, total };
  };

  const languages = new Set<string>();
  const words: VocabularyWord[] = [];
  const stamp = Date.now();
  let ambiguousSkipped = 0;
  let needsReview = 0;

  for (const [sourceRow, group] of [...sensesByRow.entries()].sort((a, b) => a[0] - b[0])) {
    // "S00" rows hold the still-combined source meaning; only used when nothing was split.
    const split = group.filter((s) => !/-S00$/i.test(norm(s["Sense ID"])));
    const useable = split.length ? split : group;
    ambiguousSkipped += group.length - useable.length;

    for (const sense of useable) {
      const senseId = norm(sense["Sense ID"]);
      const conceptId = norm(sense["Concept ID"]) || `CP-${senseId}`;
      const chinese = norm(sense["Chinese"]);
      const pinyin = norm(sense["Pinyin"]);
      const english = cleanSense(sense["English Sense"]) || concepts.get(conceptId)?.definition || "";
      if (!chinese && !english) continue;

      const values: Record<string, string> = {};
      const lexemeIds: Record<string, string> = {};
      const targetSenseIds: Record<string, string> = {};
      const senseIndexes: Record<string, { index: number; total: number }> = {};
      const senseNotes: Record<string, string> = {};

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
      const zhLexeme = norm(sense["Chinese Lexeme ID"]);
      const zhTargetSense = norm(sense["Chinese Target Sense ID"]);
      if (zhLexeme) lexemeIds["zh"] = zhLexeme;
      if (zhTargetSense) targetSenseIds["zh"] = zhTargetSense;
      const zhNumber = senseNumber(zhLexeme, zhTargetSense);
      if (zhNumber) senseIndexes["zh"] = zhNumber;

      let review = yes(sense["Needs Review"]) || Boolean(concepts.get(conceptId)?.needsReview);

      // Merge the reverse entries of this concept, per language, deduplicated by Target Sense ID.
      const perLanguage = new Map<
        string,
        { entries: string[]; latins: string[]; seen: Set<string>; lexeme: string; targetSense: string; glosses: string[] }
      >();
      for (const e of bySense.get(conceptId) ?? []) {
        const bucket =
          perLanguage.get(e.code) ??
          { entries: [], latins: [], seen: new Set<string>(), lexeme: e.lexemeId, targetSense: e.targetSenseId, glosses: [] };
        const key = e.targetSenseId || e.entry;
        if (e.entry && !bucket.seen.has(key)) {
          bucket.seen.add(key);
          bucket.entries.push(e.entry);
          bucket.latins.push(e.latin);
          if (e.gloss && !bucket.glosses.includes(e.gloss)) bucket.glosses.push(e.gloss);
        }
        perLanguage.set(e.code, bucket);
        if (e.review) review = true;
        languages.add(e.code);
      }
      for (const [code, bucket] of perLanguage) {
        const text = bucket.entries.join(", ");
        values[code] = text;
        if (bucket.lexeme) lexemeIds[code] = bucket.lexeme;
        if (bucket.targetSense) targetSenseIds[code] = bucket.targetSense;
        const numbered = senseNumber(bucket.lexeme, bucket.targetSense);
        if (numbered) senseIndexes[code] = numbered;
        // The concept definition disambiguates which meaning of this word the card is about.
        const note = concepts.get(conceptId)?.definition || bucket.glosses[0] || english;
        if (note && note !== text) senseNotes[code] = note;
        const latin = romanizationCodeFor(code);
        const latinText = bucket.latins.join(", ").trim();
        if (latin && latinText.replace(/[,\s]/g, "") && latinText !== text) {
          values[latin] = latinText;
          languages.add(latin);
        }
      }

      // Legacy target sense map still wins when present.
      for (const [code, list] of legacyBySense.get(senseId) ?? []) {
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
        const latinText = latins.join(", ").trim();
        if (list[0].latinCode && latinText.replace(/[,\s]/g, "") && latinText !== text) {
          values[list[0].latinCode] = latinText;
          languages.add(list[0].latinCode);
        }
        const note = [...new Set(notes)].join("; ");
        if (note) senseNotes[code] = note;
      }

      if (Object.keys(values).length === 0) continue;
      if (review) needsReview += 1;

      const source = mainByRow.get(sourceRow);
      const extraColumns: Record<string, string> = { "Sense ID": senseId, "Concept ID": conceptId };
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
        conceptId,
        lexemeIds: Object.keys(lexemeIds).length ? lexemeIds : undefined,
        targetSenseIds: Object.keys(targetSenseIds).length ? targetSenseIds : undefined,
        senseIndexes: Object.keys(senseIndexes).length ? senseIndexes : undefined,
        senseNotes: Object.keys(senseNotes).length ? senseNotes : undefined,
        needsReview: review || undefined,
        favorite: false,
        correctCount: 0,
        incorrectCount: 0,
      });
    }
  }

  // ── Target-only senses ────────────────────────────────────────────────────
  // Verified meanings of a target word with no HSK anchor: kept as cards with an
  // empty source side so they stay visible and filterable.
  let targetOnly = 0;
  const pushTargetOnly = (opts: {
    code: string;
    latinCode: string | null;
    entry: string;
    latin: string;
    gloss: string;
    note: string;
    id: string;
    lexemeId?: string;
    review?: boolean;
  }) => {
    const values: Record<string, string> = { [opts.code]: opts.entry };
    languages.add(opts.code);
    if (opts.latinCode && opts.latin && opts.latin !== opts.entry) {
      values[opts.latinCode] = opts.latin;
      languages.add(opts.latinCode);
    }
    if (opts.gloss) {
      values["en"] = opts.gloss;
      languages.add("en");
    }
    targetOnly += 1;
    words.push({
      id: `target_${stamp}_${opts.id || `${opts.code}_${targetOnly}`}`,
      values,
      chinese: opts.entry,
      pinyin: opts.latin,
      english: opts.gloss,
      targetOnly: true,
      needsReview: opts.review || undefined,
      lexemeIds: opts.lexemeId ? { [opts.code]: opts.lexemeId } : undefined,
      targetSenseIds: opts.id ? { [opts.code]: opts.id } : undefined,
      senseNotes: opts.note ? { [opts.code]: opts.note } : undefined,
      extraColumns: {
        "Target Sense ID": opts.id,
        "Target-only": "Yes",
        ...(opts.note ? { "Sense Note": opts.note } : {}),
      },
      favorite: false,
      correctCount: 0,
      incorrectCount: 0,
    });
  };

  const unanchoredName = findSheet(book, UNANCHORED_SHEET);
  if (unanchoredName) {
    for (const r of readSheet(book, unanchoredName)) {
      const headword = cleanSense(r["Headword"]);
      const { code, latin } = codesForLanguage(norm(r["Language"]));
      if (!headword || !code) continue;
      pushTargetOnly({
        code,
        latinCode: latin,
        entry: headword,
        latin: cleanSense(r["Latin"]),
        gloss: cleanSense(r["English Gloss"]),
        note: norm(r["Native Definition"]) || cleanSense(r["English Gloss"]),
        id: norm(r["Target Sense ID"]),
        lexemeId: norm(r["Lexeme ID"]),
        review: yes(r["Needs Review"]) || !/^(approved|verified)$/i.test(norm(r["Status"])),
      });
    }
  }
  for (const t of legacyTargets) {
    if (t.linked.length) continue;
    pushTargetOnly({
      code: t.code,
      latinCode: t.latinCode,
      entry: t.entry,
      latin: t.latin,
      gloss: t.gloss,
      note: t.note,
      id: t.id,
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
      reverseEntries: reverseUsable,
      targetSenses: sensesPerLexeme.size,
      targetOnly,
      concepts: concepts.size,
    },
  };
}
