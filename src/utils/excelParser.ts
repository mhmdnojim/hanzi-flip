import * as XLSX from "xlsx";
import { VocabularyWord } from "@/types/vocabulary";
import {
  detectLanguageFromHeader,
  getLanguage,
  romanizationCodeFor,
} from "@/utils/languages";

interface ParseResult {
  success: boolean;
  words: VocabularyWord[];
  error?: string;
  filename?: string;
  /** every language code detected in the sheet */
  languages?: string[];
}

/** Bare transcription headers get re-anchored to the closest language column */
const BARE =
  /^(transliteration|translit|romanization|romanisation|romanized|latin|pronunciation|phonetic|reading|pinyin|romaji|romaja|transcription)$/;

export async function parseExcelFile(file: File): Promise<ParseResult> {
  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array" });

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, { defval: "" });

    if (jsonData.length === 0) {
      return { success: false, words: [], error: "The Excel file is empty" };
    }

    const headers = Object.keys(jsonData[0]).filter((h) => h && !h.startsWith("__EMPTY"));

    // header -> language code (or null when it isn't a language column)
    const detected: Record<string, string | null> = {};
    headers.forEach((h) => {
      detected[h] = detectLanguageFromHeader(h);
    });

    // A bare "Transcription" / "Pinyin" column belongs to the nearest language column
    headers.forEach((header, index) => {
      const key = header.toLowerCase().trim();
      if (!BARE.test(key)) return;
      const neighbours = [...headers.slice(0, index).reverse(), ...headers.slice(index + 1)];
      for (const other of neighbours) {
        const otherCode = detected[other];
        if (!otherCode || getLanguage(otherCode).romanizationOf) continue;
        const rom = romanizationCodeFor(otherCode);
        if (rom) {
          detected[header] = rom;
          return;
        }
      }
    });

    // header -> language, first occurrence of each language wins
    const mapping: Record<string, string> = {};
    const used = new Set<string>();
    headers.forEach((header) => {
      const code = detected[header];
      if (code && !used.has(code)) {
        used.add(code);
        mapping[header] = code;
      }
    });

    const exampleHeaders = ["example", "sentence", "例句", "context"];
    const explanationHeaders = ["explanation", "note", "notes", "解释", "comment"];
    const findColumn = (candidates: string[]) =>
      headers.find(
        (key) => !mapping[key] && candidates.some((h) => key.toLowerCase().includes(h))
      );
    const exampleCol = findColumn(exampleHeaders);
    const explanationCol = findColumn(explanationHeaders);

    const languages = Object.values(mapping);
    const mainLanguages = languages.filter((code) => !getLanguage(code).romanizationOf);

    if (mainLanguages.length === 0) {
      return {
        success: false,
        words: [],
        error:
          "No language columns detected. Name each column after its language (e.g. Chinese, Pinyin, English, Arabic).",
      };
    }

    const reserved = new Set([...Object.keys(mapping), exampleCol, explanationCol].filter(Boolean) as string[]);
    const extraCols = headers.filter((k) => !reserved.has(k));

    const primary = mainLanguages.includes("zh") ? "zh" : mainLanguages[0];
    const secondary = mainLanguages.find((c) => c !== primary) || primary;
    const primaryRom = romanizationCodeFor(primary);

    const stamp = Date.now();
    const words: VocabularyWord[] = jsonData
      .map((row, index) => {
        const values: Record<string, string> = {};
        Object.entries(mapping).forEach(([header, code]) => {
          const value = String(row[header] ?? "").trim();
          if (value) values[code] = value;
        });

        const extra: Record<string, string> = {};
        for (const k of extraCols) {
          const v = row[k];
          if (v != null && String(v).trim()) extra[k] = String(v).trim();
        }

        return {
          id: `imported_${stamp}_${index}`,
          values,
          chinese: values[primary] || "",
          pinyin: (primaryRom && values[primaryRom]) || "",
          english: values[secondary] || "",
          exampleSentence: exampleCol ? String(row[exampleCol] || "").trim() || undefined : undefined,
          explanation: explanationCol ? String(row[explanationCol] || "").trim() || undefined : undefined,
          extraColumns: Object.keys(extra).length ? extra : undefined,
          favorite: false,
          correctCount: 0,
          incorrectCount: 0,
        } satisfies VocabularyWord;
      })
      .filter((w) => w.chinese);

    if (words.length === 0) {
      return {
        success: false,
        words: [],
        error: "No valid vocabulary entries found in the file",
      };
    }

    return {
      success: true,
      words,
      languages,
      filename: file.name.replace(/\.[^/.]+$/, ""),
    };
  } catch (error) {
    console.error("Excel parsing error:", error);
    return {
      success: false,
      words: [],
      error: "Failed to parse the Excel file. Please check the file format.",
    };
  }
}
