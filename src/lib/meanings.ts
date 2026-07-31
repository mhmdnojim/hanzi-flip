import React from "react";

/**
 * Multi-meaning support (ported from Lingua Match).
 *
 * A word or its translation often carries several meanings in one cell
 * ("bank, shore, embankment" / "чашка; стекло"). We split those into separate
 * meanings so the flashcard shows only the ones the user picked, while the rest
 * stay available in the shared meanings panel — for ANY language, front or back.
 */

const SEPARATORS = /\s*(?:[,;/|]|、|，|；|؛)\s*/;

/** Split a stored value into its individual meanings (always at least one entry) */
export function splitMeanings(value: string): string[] {
  if (!value) return [];
  const parts = value.split(SEPARATORS).map((p) => p.trim()).filter(Boolean);
  return parts.length ? parts : [value.trim()];
}

export function joinMeanings(meanings: string[]): string {
  return meanings.join(", ");
}

const STORAGE_KEY = "vocabulary-meaning-selection";

type SelectionStore = Record<string, string[]>;

const read = (): SelectionStore => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SelectionStore) : {};
  } catch {
    return {};
  }
};

let store: SelectionStore = typeof window === "undefined" ? {} : read();
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export function selectionKey(vocabId: string, lang: string): string {
  return `${vocabId}|${lang}`;
}

/** Text that is actually displayed (and should be spoken) for a card side */
export function getSelectedText(vocabId: string, lang: string, value: string): string {
  if (!value) return value;
  const parts = splitMeanings(value);
  if (parts.length <= 1) return value;
  const saved = (store[selectionKey(vocabId, lang)] ?? []).filter((m) => parts.includes(m));
  return joinMeanings(saved.length ? saved : parts.slice(0, 1));
}

export function setMeaningSelection(vocabId: string, lang: string, meanings: string[]) {
  store = { ...store, [selectionKey(vocabId, lang)]: meanings };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* storage full / unavailable — selection stays in memory */
  }
  emit();
}

const getSnapshot = () => store;
const getServerSnapshot = () => store;

/** Meanings currently chosen for a card side, defaulting to the first one only */
export function useMeaningSelection(vocabId: string, lang: string, meanings: string[]) {
  const state = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const saved = state[selectionKey(vocabId, lang)];

  const selected = React.useMemo(() => {
    if (meanings.length <= 1) return meanings;
    const kept = (saved ?? []).filter((m) => meanings.includes(m));
    return kept.length ? kept : meanings.slice(0, 1);
  }, [saved, meanings]);

  const setSelected = React.useCallback(
    (next: string[]) => setMeaningSelection(vocabId, lang, next),
    [vocabId, lang],
  );

  return { selected, setSelected };
}
