import { useState, useCallback, useEffect } from "react";
import { VocabularyWord, VocabularyDeck, StudyProgress, StorageMode } from "@/types/vocabulary";
import { sampleDeck } from "@/data/sampleDeck";
import { getLanguage, romanizationCodeFor } from "@/utils/languages";
import { loadData, saveData, takeLegacyLocalData } from "@/lib/deckStorage";

const LANG_KEY = "flashcard_languages_v1";

interface StoredData {
  decks: VocabularyDeck[];
  currentDeckId: string;
  progress: Record<string, StudyProgress>;
}

/** Values map for a word, falling back to the legacy chinese/pinyin/english fields */
function wordValues(word: VocabularyWord): Record<string, string> {
  if (word.values && Object.keys(word.values).length) return word.values;
  return { zh: word.chinese, "zh-pinyin": word.pinyin, en: word.english };
}

export function useVocabulary() {
  const [decks, setDecks] = useState<VocabularyDeck[]>([sampleDeck]);
  const [currentDeckId, setCurrentDeckId] = useState<string>(sampleDeck.id);
  const [storageMode, setStorageMode] = useState<StorageMode>("local");
  const [isShuffled, setIsShuffled] = useState(false);
  const [shuffledOrder, setShuffledOrder] = useState<number[]>([]);
  const [studyLang, setStudyLang] = useState<string>("zh");
  const [translationLang, setTranslationLang] = useState<string>("en");

  const currentDeck = decks.find((d) => d.id === currentDeckId) || sampleDeck;

  // Languages available in the current deck
  const deckLanguages: string[] =
    currentDeck.languages && currentDeck.languages.length
      ? currentDeck.languages
      : ["zh", "zh-pinyin", "en"];
  const availableLanguages = deckLanguages.filter((c) => !getLanguage(c).romanizationOf);

  const activeStudyLang = availableLanguages.includes(studyLang)
    ? studyLang
    : availableLanguages.includes("zh")
      ? "zh"
      : availableLanguages[0] || "zh";
  const activeTranslationLang =
    availableLanguages.includes(translationLang) && translationLang !== activeStudyLang
      ? translationLang
      : availableLanguages.find((c) => c !== activeStudyLang) || activeStudyLang;

  const transcriptionLang = romanizationCodeFor(activeStudyLang);

  /** Pick the front language; if it's currently the back language, swap the two */
  const chooseStudyLang = useCallback(
    (code: string) => {
      setStudyLang(code);
      setTranslationLang((prev) => (prev === code ? activeStudyLang : prev));
    },
    [activeStudyLang],
  );

  /** Pick the back language; if it's currently the front language, swap the two */
  const chooseTranslationLang = useCallback(
    (code: string) => {
      setTranslationLang(code);
      setStudyLang((prev) => (prev === code ? activeTranslationLang : prev));
    },
    [activeTranslationLang],
  );

  // Project every word onto the selected study / translation languages
  const projectedWords: VocabularyWord[] = currentDeck.words.map((w) => {
    const values = wordValues(w);
    return {
      ...w,
      chinese: values[activeStudyLang] ?? "",
      pinyin: (transcriptionLang && values[transcriptionLang]) || "",
      english: values[activeTranslationLang] ?? "",
      senseNote: w.senseNotes?.[activeStudyLang],
    };
  });

  const words = isShuffled
    ? shuffledOrder.map((i) => projectedWords[i]).filter(Boolean)
    : projectedWords;

  // Persist the language selection
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LANG_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.studyLang) setStudyLang(parsed.studyLang);
        if (parsed?.translationLang) setTranslationLang(parsed.translationLang);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LANG_KEY, JSON.stringify({ studyLang, translationLang }));
    } catch { /* ignore */ }
  }, [studyLang, translationLang]);

  // Load persisted decks (IndexedDB, with one-time localStorage migration)
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (storageMode !== "local") return;
    let cancelled = false;
    (async () => {
      const data =
        takeLegacyLocalData<StoredData>() ?? (await loadData<StoredData>());
      if (!cancelled && data?.decks?.length) {
        setDecks(data.decks);
        setCurrentDeckId(data.currentDeckId);
      }
      if (!cancelled) setHydrated(true);
    })();
    return () => { cancelled = true; };
  }, [storageMode]);

  // Persist decks when they change
  useEffect(() => {
    if (storageMode !== "local" || !hydrated) return;
    void saveData<StoredData>({ decks, currentDeckId, progress: {} });
  }, [decks, currentDeckId, storageMode, hydrated]);

  const addDeck = useCallback((
    name: string,
    words: VocabularyWord[],
    languages?: string[],
    columns?: VocabularyDeck["columns"],
  ) => {
    const newDeck: VocabularyDeck = {
      id: `deck_${Date.now()}`,
      name,
      words: words.map((w, i) => ({ ...w, id: `${Date.now()}_${i}` })),
      createdAt: new Date(),
      languages,
      columns,
    };
    setDecks((prev) => [...prev, newDeck]);
    setCurrentDeckId(newDeck.id);
    return newDeck.id;
  }, []);

  const deleteDeck = useCallback((deckId: string) => {
    setDecks((prev) => {
      const next = prev.filter((d) => d.id !== deckId);
      const remaining = next.length ? next : [sampleDeck];
      setCurrentDeckId((current) =>
        current === deckId ? remaining[0].id : current
      );
      return remaining;
    });
    setIsShuffled(false);
    setShuffledOrder([]);
  }, []);

  const updateWord = useCallback(
    (wordId: string, updates: Partial<VocabularyWord>) => {
      setDecks((prev) =>
        prev.map((deck) =>
          deck.id === currentDeckId
            ? {
                ...deck,
                words: deck.words.map((w) =>
                  w.id === wordId ? { ...w, ...updates } : w
                ),
              }
            : deck
        )
      );
    },
    [currentDeckId]
  );

  const toggleFavorite = useCallback(
    (wordId: string) => {
      setDecks((prev) =>
        prev.map((deck) =>
          deck.id === currentDeckId
            ? {
                ...deck,
                words: deck.words.map((w) =>
                  w.id === wordId ? { ...w, favorite: !w.favorite } : w
                ),
              }
            : deck
        )
      );
    },
    [currentDeckId]
  );

  const markCorrect = useCallback(
    (wordId: string) => {
      const word = currentDeck.words.find((w) => w.id === wordId);
      const isCorrect = (word?.correctCount || 0) > 0;

      // Toggle correct on/off; correct and incorrect are mutually exclusive
      updateWord(wordId, {
        correctCount: isCorrect ? 0 : 1,
        incorrectCount: isCorrect ? (word?.incorrectCount || 0) : 0,
      });
    },
    [currentDeck.words, updateWord]
  );

  const markIncorrect = useCallback(
    (wordId: string) => {
      const word = currentDeck.words.find((w) => w.id === wordId);
      const isIncorrect = (word?.incorrectCount || 0) > 0;

      // Toggle incorrect on/off; correct and incorrect are mutually exclusive
      updateWord(wordId, {
        incorrectCount: isIncorrect ? 0 : 1,
        correctCount: isIncorrect ? (word?.correctCount || 0) : 0,
      });
    },
    [currentDeck.words, updateWord]
  );

  const shuffleWords = useCallback(() => {
    const indices = Array.from({ length: currentDeck.words.length }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    setShuffledOrder(indices);
    setIsShuffled(true);
  }, [currentDeck.words.length]);

  const resetOrder = useCallback(() => {
    setIsShuffled(false);
    setShuffledOrder([]);
  }, []);

  const resetProgress = useCallback(() => {
    setDecks((prev) =>
      prev.map((deck) =>
        deck.id === currentDeckId
          ? {
              ...deck,
              words: deck.words.map((w) => ({
                ...w,
                correctCount: 0,
                incorrectCount: 0,
              })),
            }
          : deck
      )
    );
  }, [currentDeckId]);

  const getFavorites = useCallback(() => {
    return currentDeck.words.filter((w) => w.favorite);
  }, [currentDeck.words]);

  const exportFavorites = useCallback(() => {
    const favorites = getFavorites();
    const data = JSON.stringify(favorites, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `favorites_${currentDeck.name.replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [currentDeck.name, getFavorites]);

  const exportProgressCSV = useCallback(() => {
    const headers = ["Chinese", "Pinyin", "English", "Favorite", "Correct", "Incorrect"];
    const rows = currentDeck.words.map((w) => [
      w.chinese,
      w.pinyin,
      w.english,
      w.favorite ? "Yes" : "No",
      w.correctCount || 0,
      w.incorrectCount || 0,
    ]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `progress_${currentDeck.name.replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [currentDeck]);

  return {
    decks,
    currentDeck,
    currentDeckId,
    words,
    isShuffled,
    storageMode,
    availableLanguages,
    studyLang: activeStudyLang,
    translationLang: activeTranslationLang,
    setStudyLang: chooseStudyLang,
    setTranslationLang: chooseTranslationLang,
    setStorageMode,
    setCurrentDeckId,
    addDeck,
    deleteDeck,
    updateWord,
    toggleFavorite,
    markCorrect,
    markIncorrect,
    shuffleWords,
    resetOrder,
    resetProgress,
    getFavorites,
    exportFavorites,
    exportProgressCSV,
  };
}
