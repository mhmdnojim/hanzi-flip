// Writes deck edits back to the original Excel file.
//
// When the browser supports the File System Access API we keep the file handle
// that was used at import time and silently overwrite that .xlsx on every edit.
// Otherwise we fall back to a "Save as…" download of the rebuilt workbook.
import * as XLSX from "xlsx";
import { VocabularyDeck } from "@/types/vocabulary";

const DB_NAME = "flashcard_files";
const STORE = "handles";

type AnyHandle = any; // FileSystemFileHandle (not in every TS lib target)

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function setDeckFileHandle(deckId: string, handle: AnyHandle): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(handle, deckId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch { /* ignore */ }
}

export async function getDeckFileHandle(deckId: string): Promise<AnyHandle | null> {
  try {
    const db = await openDB();
    return await new Promise<AnyHandle | null>((resolve, reject) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).get(deckId);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export function supportsFileSystemAccess(): boolean {
  return typeof (window as any).showOpenFilePicker === "function";
}

/** Rebuild the workbook rows from the deck, preserving the original column order. */
function deckToRows(deck: VocabularyDeck): Record<string, string>[] {
  const cols = deck.columns;
  const headers = cols?.headers?.length
    ? cols.headers
    : ["Original", "Transcription", "Translation"];
  const mapping = cols?.mapping ?? {};

  return deck.words.map((word) => {
    const row: Record<string, string> = {};
    for (const header of headers) {
      const code = mapping[header];
      if (code) {
        row[header] = word.values?.[code] ?? "";
      } else if (header === cols?.exampleCol) {
        row[header] = word.exampleSentence ?? "";
      } else if (header === cols?.explanationCol) {
        row[header] = word.explanation ?? "";
      } else {
        row[header] = word.extraColumns?.[header] ?? "";
      }
    }
    if (!cols) {
      row["Original"] = word.chinese;
      row["Transcription"] = word.pinyin;
      row["Translation"] = word.english;
    }
    return row;
  });
}

function deckToBlob(deck: VocabularyDeck): Blob {
  const rows = deckToRows(deck);
  const sheet = XLSX.utils.json_to_sheet(rows, {
    header: Object.keys(rows[0] ?? {}),
  });
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, deck.columns?.sheetName || "Sheet1");
  const out = XLSX.write(book, { bookType: "xlsx", type: "array" });
  return new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

async function canWrite(handle: AnyHandle): Promise<boolean> {
  try {
    if ((await handle.queryPermission?.({ mode: "readwrite" })) === "granted") return true;
    return (await handle.requestPermission?.({ mode: "readwrite" })) === "granted";
  } catch {
    return false;
  }
}

/** Overwrite the deck's source .xlsx. Returns true when the file itself was written. */
export async function saveDeckToExcel(deck: VocabularyDeck): Promise<boolean> {
  const handle = await getDeckFileHandle(deck.id);
  if (!handle) return false;
  if (!(await canWrite(handle))) return false;
  try {
    const writable = await handle.createWritable();
    await writable.write(deckToBlob(deck));
    await writable.close();
    return true;
  } catch (e) {
    console.error("Excel write-back failed:", e);
    return false;
  }
}

/** Explicit "save a copy" — picks a location (or downloads) and remembers the handle. */
export async function downloadDeckAsExcel(deck: VocabularyDeck): Promise<void> {
  const blob = deckToBlob(deck);
  const filename = `${deck.name.replace(/\s+/g, "_")}.xlsx`;
  const picker = (window as any).showSaveFilePicker;
  if (typeof picker === "function") {
    try {
      const handle = await picker({
        suggestedName: filename,
        types: [
          {
            description: "Excel workbook",
            accept: {
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
            },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      await setDeckFileHandle(deck.id, handle);
      return;
    } catch (e: any) {
      if (e?.name === "AbortError") return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
