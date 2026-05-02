import * as XLSX from "xlsx";
import { VocabularyWord } from "@/types/vocabulary";

interface ParseResult {
  success: boolean;
  words: VocabularyWord[];
  error?: string;
  filename?: string;
}

export async function parseExcelFile(file: File): Promise<ParseResult> {
  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: "array" });
    
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet);
    
    if (jsonData.length === 0) {
      return { success: false, words: [], error: "The Excel file is empty" };
    }

    // Try to find the correct column headers
    const firstRow = jsonData[0];
    const keys = Object.keys(firstRow);
    
    // Common header variations
    const chineseHeaders = ["chinese", "中文", "hanzi", "character", "word"];
    const pinyinHeaders = ["pinyin", "拼音", "pronunciation"];
    const englishHeaders = ["english", "英文", "translation", "meaning", "definition"];
    const exampleHeaders = ["example", "sentence", "例句", "example sentence", "context"];
    const explanationHeaders = ["explanation", "note", "notes", "解释", "comment", "comments"];
    
    const findColumn = (headers: string[]) => {
      return keys.find((key) =>
        headers.some((h) => key.toLowerCase().includes(h.toLowerCase()))
      );
    };

    const chineseCol = findColumn(chineseHeaders) || keys[0];
    const pinyinCol = findColumn(pinyinHeaders) || keys[1];
    const englishCol = findColumn(englishHeaders) || keys[2];
    const exampleCol = findColumn(exampleHeaders);
    const explanationCol = findColumn(explanationHeaders);

    const reservedCols = new Set(
      [chineseCol, pinyinCol, englishCol, exampleCol, explanationCol].filter(Boolean) as string[]
    );
    const extraCols = keys.filter((k) => !reservedCols.has(k));

    if (!chineseCol || !englishCol) {
      return {
        success: false,
        words: [],
        error: "Could not find Chinese and English columns. Please ensure your Excel has columns for Chinese, Pinyin, and English.",
      };
    }

    const words: VocabularyWord[] = jsonData
      .filter((row) => row[chineseCol] && row[englishCol])
      .map((row, index) => {
        const extra: Record<string, string> = {};
        for (const k of extraCols) {
          const v = row[k];
          if (v != null && String(v).trim()) extra[k] = String(v).trim();
        }
        return {
          id: `imported_${Date.now()}_${index}`,
          chinese: String(row[chineseCol] || "").trim(),
          pinyin: String(row[pinyinCol] || "").trim(),
          english: String(row[englishCol] || "").trim(),
          exampleSentence: exampleCol ? String(row[exampleCol] || "").trim() || undefined : undefined,
          explanation: explanationCol ? String(row[explanationCol] || "").trim() || undefined : undefined,
          extraColumns: Object.keys(extra).length ? extra : undefined,
          favorite: false,
          correctCount: 0,
          incorrectCount: 0,
        };
      });

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
