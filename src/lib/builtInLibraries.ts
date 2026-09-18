// Built-in vocabulary libraries that ship with the app.
// Each library is one workbook whose sheets are the levels (HSK1…HSK6, A1…C1).
import * as XLSX from "xlsx";
import { detectHeaderLanguages, buildWordsFromMapping, type SheetPreview } from "@/utils/excelParser";

export interface BuiltInLibrary {
  id: string;
  name: string;
  url: string;
  levels: string[];
  /** Bump when workbook-derived fields change so saved copies reload from the file. */
  version: string;
}

export const BUILT_IN_LIBRARIES: BuiltInLibrary[] = [
  {
    id: "new-hsk",
    name: "New HSK 1–6 (multilingual)",
    url: "/libraries/new-hsk-1-6.xlsx",
    levels: ["HSK1", "HSK2", "HSK3", "HSK4", "HSK5", "HSK6"],
    version: "latin-file-v1",
  },
  {
    id: "english-dictionary",
    name: "English Dictionary A1–C1",
    url: "/libraries/english-dictionary-a1-c1.xlsx",
    levels: ["A1", "A2", "B1", "B2", "C1"],
    version: "latin-file-v1",
  },
];

export function getBuiltInLibrary(id: string): BuiltInLibrary | undefined {
  return BUILT_IN_LIBRARIES.find((l) => l.id === id);
}

const bookCache = new Map<string, XLSX.WorkBook>();

async function loadBook(library: BuiltInLibrary): Promise<XLSX.WorkBook> {
  const cached = bookCache.get(library.id);
  if (cached) return cached;
  const response = await fetch(library.url);
  if (!response.ok) throw new Error(`Couldn't download ${library.name}`);
  const book = XLSX.read(await response.arrayBuffer(), { type: "array" });
  bookCache.set(library.id, book);
  return book;
}

export interface BuiltInLevelDeck {
  name: string;
  words: ReturnType<typeof buildWordsFromMapping>["words"];
  languages?: string[];
  columns?: ReturnType<typeof buildWordsFromMapping>["columns"];
}

/** Load one level (sheet) of a built-in library, auto-detecting language columns. */
export async function loadBuiltInLevel(
  libraryId: string,
  level: string,
): Promise<BuiltInLevelDeck> {
  const library = getBuiltInLibrary(libraryId);
  if (!library) throw new Error("Unknown library");
  const book = await loadBook(library);
  const sheetName = book.SheetNames.find((n) => n.toLowerCase() === level.toLowerCase());
  if (!sheetName) throw new Error(`${level} isn't in ${library.name}`);

  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(book.Sheets[sheetName], {
    defval: "",
  });
  if (!rows.length) throw new Error(`${level} is empty`);

  const headers = Object.keys(rows[0]).filter((h) => h && !h.startsWith("__EMPTY"));
  const suggestion = detectHeaderLanguages(headers);
  const samples: Record<string, string[]> = {};
  for (const header of headers) {
    samples[header] = rows
      .slice(0, 12)
      .map((r) => String(r[header] ?? "").trim())
      .filter(Boolean)
      .slice(0, 3);
  }
  const findColumn = (candidates: string[]) =>
    headers.find((key) => !suggestion[key] && candidates.some((c) => key.toLowerCase().includes(c)));

  const preview: SheetPreview = {
    success: true,
    filename: `${library.name} — ${level}`,
    headers,
    samples,
    suggestion,
    rows,
    exampleCol: findColumn(["example", "sentence", "例句", "context"]),
    explanationCol: findColumn(["explanation", "note", "notes", "解释", "comment"]),
  };

  const result = buildWordsFromMapping(preview, suggestion);
  if (!result.success) throw new Error(result.error || "Couldn't read this level");

  return {
    name: `${library.name} — ${level}`,
    words: result.words,
    languages: result.languages,
    columns: result.columns,
  };
}
