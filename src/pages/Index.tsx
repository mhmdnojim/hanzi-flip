import { useState, useCallback, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { FlashcardView } from "@/components/FlashcardView";
import { CompactToolbar } from "@/components/CompactToolbar";
import { WordListPanel } from "@/components/WordListPanel";
import { useVocabulary } from "@/hooks/useVocabulary";
import { useAudio } from "@/hooks/useAudio";
import { useStudySession } from "@/hooks/useStudySession";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { parseExcelFile } from "@/utils/excelParser";
import { useToast } from "@/hooks/use-toast";
import { CustomSequenceStep } from "@/types/vocabulary";
import {
  loadSequencePresets, saveSequencePresets,
  getLastActivePresetId, setLastActivePresetId,
  genPresetId, sequenceSignature, type SequencePreset,
} from "@/lib/sequencePresets";
import { detectLanguageNameFromText } from "@/lib/detectLanguage";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const { toast } = useToast();
  const [isFlipped, setIsFlipped] = useState(false);
  const [showPinyin, setShowPinyin] = useState(true);
  const [showChineseFirst, setShowChineseFirst] = useState(true);
  const [fontSize, setFontSize] = useState(72);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const vocabulary = useVocabulary();
  const audio = useAudio();

  // ── Excluded words (word-list panel) ──
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const [showWordList, setShowWordList] = useState(false);

  // Active deck = vocabulary words minus excluded
  const activeWords = useMemo(
    () => vocabulary.words.filter((w) => !excludedIds.has(w.id)),
    [vocabulary.words, excludedIds]
  );

  // ── Local override of words for AI-generated example sentences ──
  const [exampleOverrides, setExampleOverrides] = useState<Record<string, string>>({});
  const wordsWithExamples = useMemo(
    () => activeWords.map((w) => exampleOverrides[w.id]
      ? { ...w, exampleSentence: exampleOverrides[w.id] }
      : w),
    [activeWords, exampleOverrides]
  );

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
    audio.playSoundEffect("flip");
  }, [audio]);

  // State for timing controls
  const [nextDelay, setNextDelay] = useState(3);
  const [languageGap, setLanguageGap] = useState(1.5);
  const [includeExample, setIncludeExample] = useState(false);

  // ── Custom sequence + presets ──
  const [sequencePresets, setSequencePresets] = useState<SequencePreset[]>(
    () => loadSequencePresets()
  );
  const [activePresetId, setActivePresetId] = useState<string | null>(() => {
    const id = getLastActivePresetId();
    if (!id) return null;
    return loadSequencePresets().some((p) => p.id === id) ? id : null;
  });
  const [customSequence, setCustomSequence] = useState<CustomSequenceStep[]>(() => {
    const lastId = getLastActivePresetId();
    if (lastId) {
      const preset = loadSequencePresets().find((p) => p.id === lastId);
      if (preset) return preset.steps;
    }
    try {
      const saved = localStorage.getItem("flashcard_custom_sequence_v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed as CustomSequenceStep[];
      }
    } catch { /* ignore */ }
    return [
      { track: "original", repeat: 1 },
      { track: "translation", repeat: 3 },
    ];
  });

  useEffect(() => {
    try { localStorage.setItem("flashcard_custom_sequence_v1", JSON.stringify(customSequence)); } catch { /* ignore */ }
  }, [customSequence]);
  useEffect(() => { saveSequencePresets(sequencePresets); }, [sequencePresets]);
  useEffect(() => { setLastActivePresetId(activePresetId); }, [activePresetId]);

  const handleSelectPreset = useCallback((id: string) => {
    const preset = sequencePresets.find((p) => p.id === id);
    if (!preset) return;
    setActivePresetId(id);
    setCustomSequence(preset.steps);
  }, [sequencePresets]);

  const handleSaveAsPreset = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = genPresetId();
    const next: SequencePreset = { id, name: trimmed, steps: customSequence, updatedAt: Date.now() };
    setSequencePresets((prev) => [...prev, next]);
    setActivePresetId(id);
    toast({ title: `Saved sequence "${trimmed}"`, duration: 1500 });
  }, [customSequence, toast]);

  const handleUpdateActivePreset = useCallback(() => {
    if (!activePresetId) return;
    setSequencePresets((prev) => prev.map((p) =>
      p.id === activePresetId ? { ...p, steps: customSequence, updatedAt: Date.now() } : p
    ));
    toast({ title: "Preset updated", duration: 1200 });
  }, [activePresetId, customSequence, toast]);

  const handleRenameActivePreset = useCallback((newName: string) => {
    if (!activePresetId) return;
    const trimmed = newName.trim();
    if (!trimmed) return;
    setSequencePresets((prev) => prev.map((p) =>
      p.id === activePresetId ? { ...p, name: trimmed, updatedAt: Date.now() } : p
    ));
  }, [activePresetId]);

  const handleDeleteActivePreset = useCallback(() => {
    if (!activePresetId) return;
    const target = sequencePresets.find((p) => p.id === activePresetId);
    setSequencePresets((prev) => prev.filter((p) => p.id !== activePresetId));
    setActivePresetId(null);
    if (target) toast({ title: `Deleted "${target.name}"`, duration: 1200 });
  }, [activePresetId, sequencePresets, toast]);

  const studySession = useStudySession({
    totalWords: wordsWithExamples.length,
    onFlip: handleFlip,
    speakChinese: audio.speakChinese,
    speakEnglish: audio.speakEnglish,
    getWordAtIndex: useCallback(
      (index: number) => {
        const w = wordsWithExamples[index];
        if (!w) return null;
        return { chinese: w.chinese, english: w.english, example: w.exampleSentence };
      },
      [wordsWithExamples]
    ),
    isFlipped,
    languageGap,
    nextDelay,
    includeExampleInPlayback: includeExample,
    customSequence,
  });

  const activeWord = wordsWithExamples[studySession.currentIndex];

  // Detect language labels from a sample word
  const { originalLabel, translationLabel } = useMemo(() => {
    const sample = vocabulary.words.find((w) => w.chinese);
    return {
      originalLabel: sample ? detectLanguageNameFromText(sample.chinese) : "Original",
      translationLabel: sample ? detectLanguageNameFromText(sample.english) : "Translation",
    };
  }, [vocabulary.words]);

  // Reset excluded words when deck changes
  useEffect(() => {
    setExcludedIds(new Set());
    setExampleOverrides({});
  }, [vocabulary.currentDeckId]);

  // Pronounce the visible language on the card
  const pronounceVisibleLanguage = useCallback((word: typeof activeWord, flipped: boolean) => {
    if (!word || audio.voiceMuted) return;
    const showingChinese = showChineseFirst ? !flipped : flipped;
    if (showingChinese) {
      audio.speakChinese(word.chinese);
    } else {
      audio.speakEnglish(word.english);
    }
  }, [audio, showChineseFirst]);

  // Pronounce on initial load or when vocabulary changes
  useEffect(() => {
    if (activeWord && vocabulary.words.length > 0) {
      pronounceVisibleLanguage(activeWord, false);
    }
  }, [vocabulary.currentDeckId]);

  const handleNext = useCallback(() => {
    studySession.goToNext();
    setIsFlipped(false);
    audio.playSoundEffect("navigate");
    setTimeout(() => {
      const nextWord = wordsWithExamples[studySession.currentIndex + 1] || wordsWithExamples[0];
      if (nextWord) pronounceVisibleLanguage(nextWord, false);
    }, 100);
  }, [studySession, audio, wordsWithExamples, pronounceVisibleLanguage]);

  const handlePrevious = useCallback(() => {
    studySession.goToPrevious();
    setIsFlipped(false);
    audio.playSoundEffect("navigate");
    setTimeout(() => {
      const prevIndex = studySession.currentIndex - 1;
      const prevWord = wordsWithExamples[prevIndex >= 0 ? prevIndex : wordsWithExamples.length - 1];
      if (prevWord) pronounceVisibleLanguage(prevWord, false);
    }, 100);
  }, [studySession, audio, wordsWithExamples, pronounceVisibleLanguage]);

  const handleCorrect = useCallback(() => {
    if (activeWord) {
      const wasCorrect = (activeWord.correctCount || 0) > 0;
      vocabulary.markCorrect(activeWord.id);
      audio.playSoundEffect("correct");
      toast({
        title: wasCorrect ? "Correct removed" : "Correct! 🎉",
        duration: 1000,
      });
    }
  }, [activeWord, vocabulary, audio, toast]);

  const handleIncorrect = useCallback(() => {
    if (activeWord) {
      const wasIncorrect = (activeWord.incorrectCount || 0) > 0;
      vocabulary.markIncorrect(activeWord.id);
      audio.playSoundEffect("incorrect");
      toast({
        title: wasIncorrect ? "Incorrect removed" : "Keep practicing! 💪",
        duration: 1000,
      });
    }
  }, [activeWord, vocabulary, audio, toast]);

  const handleShuffle = useCallback(() => {
    vocabulary.shuffleWords();
    studySession.goToIndex(0);
    setIsFlipped(false);
    toast({ title: "Deck shuffled!", duration: 1500 });
  }, [vocabulary, studySession, toast]);

  const handleImport = useCallback(
    async (file: File) => {
      const result = await parseExcelFile(file);
      if (result.success) {
        vocabulary.addDeck(result.filename || "Imported Deck", result.words);
        toast({
          title: "Import successful!",
          description: `Added ${result.words.length} words`,
        });
      } else {
        toast({
          title: "Import failed",
          description: result.error,
          variant: "destructive",
        });
      }
    },
    [vocabulary, toast]
  );

  // Dark mode toggle
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onFlip: handleFlip,
    onNext: handleNext,
    onPrevious: handlePrevious,
    onCorrect: handleCorrect,
    onIncorrect: handleIncorrect,
    onShuffle: handleShuffle,
  });

  // Calculate counts
  const favoritesCount = wordsWithExamples.filter((w) => w.favorite).length;
  const correctCount = wordsWithExamples.filter((w) => (w.correctCount || 0) > 0).length;
  const incorrectCount = wordsWithExamples.filter((w) => (w.incorrectCount || 0) > 0).length;

  // ── AI-generate example sentences ──
  const [isGeneratingExamples, setIsGeneratingExamples] = useState(false);
  const handleGenerateExamples = useCallback(async () => {
    if (isGeneratingExamples) return;
    const missing = wordsWithExamples.filter((w) => !w.exampleSentence && w.chinese);
    if (missing.length === 0) {
      toast({ title: "All cards already have an example sentence." });
      return;
    }
    setIsGeneratingExamples(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-flashcard-examples", {
        body: {
          words: missing.map((w) => ({ original: w.chinese, translated: w.english })),
          language: originalLabel,
        },
      });
      if (error) throw error;
      const examples: { word: string; sentence: string }[] = data?.examples || [];
      if (examples.length === 0) {
        toast({ title: "AI didn't return any examples.", variant: "destructive" });
        return;
      }
      // Match each example back to its word (by original text)
      const next: Record<string, string> = { ...exampleOverrides };
      const remaining = [...examples];
      for (const w of missing) {
        const idx = remaining.findIndex((p) => p.word === w.chinese);
        if (idx >= 0) {
          next[w.id] = remaining[idx].sentence;
          remaining.splice(idx, 1);
        }
      }
      setExampleOverrides(next);
      toast({ title: `Added ${Object.keys(next).length - Object.keys(exampleOverrides).length} examples.` });
    } catch (e: any) {
      console.error("generate examples failed:", e);
      toast({
        title: "Failed to generate examples",
        description: e?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingExamples(false);
    }
  }, [isGeneratingExamples, wordsWithExamples, originalLabel, exampleOverrides, toast]);

  // Jump-to from word-list panel
  const handleJumpTo = useCallback((wordId: string) => {
    const idx = wordsWithExamples.findIndex((w) => w.id === wordId);
    if (idx >= 0) {
      studySession.goToIndex(idx);
      setIsFlipped(false);
      setShowWordList(false);
    }
  }, [wordsWithExamples, studySession]);

  if (!activeWord) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">
          {vocabulary.words.length === 0
            ? "No vocabulary loaded"
            : "All words excluded — open the word list to include some."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex flex-col">
      <div className="w-full max-w-[95vw] xl:max-w-[90vw] mx-auto px-2 sm:px-4 py-2 sm:py-4 flex flex-col flex-1">
        {/* Compact Toolbar - One line of small round buttons */}
        <CompactToolbar
          deckName={vocabulary.currentDeck.name}
          decks={vocabulary.decks}
          currentDeckId={vocabulary.currentDeckId}
          onDeckChange={vocabulary.setCurrentDeckId}
          onImport={handleImport}
          showPinyin={showPinyin}
          onTogglePinyin={() => setShowPinyin(!showPinyin)}
          showChineseFirst={showChineseFirst}
          onResetFlip={() => setIsFlipped(false)}
          onToggleChineseFirst={() => setShowChineseFirst(!showChineseFirst)}
          voiceType={audio.voiceType}
          onVoiceTypeChange={audio.setVoiceType}
          voiceMuted={audio.voiceMuted}
          onToggleVoiceMuted={() => audio.setVoiceMuted(!audio.voiceMuted)}
          sfxMuted={audio.sfxMuted}
          onToggleSfxMuted={() => audio.setSfxMuted(!audio.sfxMuted)}
          isShuffled={vocabulary.isShuffled}
          onShuffle={handleShuffle}
          onResetOrder={vocabulary.resetOrder}
          onResetProgress={vocabulary.resetProgress}
        />

        {/* Flashcard View - Full width, contains everything */}
        <div className="flex-1 mt-2 sm:mt-4">
          <FlashcardView
            word={activeWord}
            isFlipped={isFlipped}
            onFlip={handleFlip}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onToggleFavorite={() => vocabulary.toggleFavorite(activeWord.id)}
            showPinyin={showPinyin}
            showChineseFirst={showChineseFirst}
            fontSize={fontSize}
            onFontSizeChange={setFontSize}
            onSpeakChinese={() => audio.speakChinese(activeWord.chinese)}
            onSpeakEnglish={() => audio.speakEnglish(activeWord.english)}
            autoplayMode={studySession.autoplayMode}
            onAutoplayModeChange={studySession.setAutoplayMode}
            isAutoplayActive={studySession.isAutoplayActive}
            autoplayRepeatCount={studySession.autoplayRepeatCount}
            onAutoplayRepeatCountChange={studySession.setAutoplayRepeatCount}
            isAutoplayRepeating={studySession.isAutoplayRepeating}
            onToggleAutoplayRepeat={studySession.toggleAutoplayRepeat}
            repeatMode={studySession.repeatMode}
            onRepeatModeChange={studySession.setRepeatMode}
            isRepeatActive={studySession.isRepeatActive}
            displayMode={studySession.displayMode}
            currentlySpoken={studySession.currentlySpoken}
            // Progress & Stats
            currentIndex={studySession.currentIndex}
            totalWords={wordsWithExamples.length}
            percentage={studySession.completionPercentage}
            onSeek={studySession.goToIndex}
            correctCount={correctCount}
            incorrectCount={incorrectCount}
            // Stats inside card
            favoritesCount={favoritesCount}
            elapsedTime={studySession.formattedTime}
            completionPercentage={studySession.completionPercentage}
            // Timing controls
            nextDelay={nextDelay}
            onNextDelayChange={setNextDelay}
            languageGap={languageGap}
            onLanguageGapChange={setLanguageGap}
            // Dark mode
            isDarkMode={isDarkMode}
            onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
            // Scoring
            onCorrect={handleCorrect}
            onIncorrect={handleIncorrect}
            // ── Ported features ──
            originalLabel={originalLabel}
            translationLabel={translationLabel}
            onSpeakExample={() => activeWord.exampleSentence && audio.speakChinese(activeWord.exampleSentence)}
            includeExample={includeExample}
            onIncludeExampleChange={setIncludeExample}
            customSequence={customSequence}
            onCustomSequenceChange={setCustomSequence}
            sequencePresets={sequencePresets}
            activePresetId={activePresetId}
            onSelectPreset={handleSelectPreset}
            onSaveAsPreset={handleSaveAsPreset}
            onUpdateActivePreset={handleUpdateActivePreset}
            onRenameActivePreset={handleRenameActivePreset}
            onDeleteActivePreset={handleDeleteActivePreset}
            onOpenWordList={() => setShowWordList(true)}
            onGenerateExamples={handleGenerateExamples}
            isGeneratingExamples={isGeneratingExamples}
          />
        </div>

      </div>

      <WordListPanel
        words={vocabulary.words}
        excludedIds={excludedIds}
        onExcludedChange={(next) => {
          setExcludedIds(next);
          studySession.goToIndex(0);
          setIsFlipped(false);
        }}
        currentWordId={activeWord?.id}
        onJumpTo={handleJumpTo}
        open={showWordList}
        onClose={() => setShowWordList(false)}
      />
    </div>
  );
};

export default Index;
