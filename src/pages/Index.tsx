import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Flashcard } from "@/components/Flashcard";
import { ProgressBar } from "@/components/ProgressBar";
import { TopToolbar } from "@/components/TopToolbar";
import { StudyStats } from "@/components/StudyStats";
import { NavigationControls } from "@/components/NavigationControls";
import { useVocabulary } from "@/hooks/useVocabulary";
import { useAudio } from "@/hooks/useAudio";
import { useStudySession } from "@/hooks/useStudySession";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { parseExcelFile } from "@/utils/excelParser";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const { toast } = useToast();
  const [isFlipped, setIsFlipped] = useState(false);
  const [showPinyin, setShowPinyin] = useState(true);
  const [showChineseFirst, setShowChineseFirst] = useState(true);
  const [fontSize, setFontSize] = useState(72);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const vocabulary = useVocabulary();
  const audio = useAudio();

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
    audio.playSoundEffect("flip");
  }, [audio]);

  // State for timing controls (lifted here to avoid circular dependency)
  const [nextDelay, setNextDelay] = useState(3);
  const [languageGap, setLanguageGap] = useState(1.5);

  const studySession = useStudySession({
    totalWords: vocabulary.words.length,
    onFlip: handleFlip,
    speakChinese: audio.speakChinese,
    speakEnglish: audio.speakEnglish,
    getWordAtIndex: useCallback(
      (index: number) => vocabulary.words[index] || null,
      [vocabulary.words]
    ),
    isFlipped,
    languageGap,
    nextDelay,
  });

  const activeWord = vocabulary.words[studySession.currentIndex];

  // Auto-pronounce when word changes (navigation or initial load)
  const pronounceCurrentWord = useCallback(() => {
    if (activeWord && !audio.voiceMuted) {
      if (showChineseFirst) {
        audio.speakChinese(activeWord.chinese);
      } else {
        audio.speakEnglish(activeWord.english);
      }
    }
  }, [activeWord, audio, showChineseFirst]);

  // Pronounce on initial load or when vocabulary changes
  useEffect(() => {
    if (activeWord && vocabulary.words.length > 0) {
      pronounceCurrentWord();
    }
  }, [vocabulary.currentDeckId]); // Only on deck change/initial load

  const handleNext = useCallback(() => {
    studySession.goToNext();
    setIsFlipped(false);
    audio.playSoundEffect("navigate");
    // Pronounce after navigation
    setTimeout(() => {
      const nextWord = vocabulary.words[studySession.currentIndex + 1] || vocabulary.words[0];
      if (nextWord && !audio.voiceMuted) {
        if (showChineseFirst) {
          audio.speakChinese(nextWord.chinese);
        } else {
          audio.speakEnglish(nextWord.english);
        }
      }
    }, 100);
  }, [studySession, audio, vocabulary.words, showChineseFirst]);

  const handlePrevious = useCallback(() => {
    studySession.goToPrevious();
    setIsFlipped(false);
    audio.playSoundEffect("navigate");
    // Pronounce after navigation
    setTimeout(() => {
      const prevIndex = studySession.currentIndex - 1;
      const prevWord = vocabulary.words[prevIndex >= 0 ? prevIndex : vocabulary.words.length - 1];
      if (prevWord && !audio.voiceMuted) {
        if (showChineseFirst) {
          audio.speakChinese(prevWord.chinese);
        } else {
          audio.speakEnglish(prevWord.english);
        }
      }
    }, 100);
  }, [studySession, audio, vocabulary.words, showChineseFirst]);

  const handleCorrect = useCallback(() => {
    if (activeWord) {
      vocabulary.markCorrect(activeWord.id);
      audio.playSoundEffect("correct");
      toast({ title: "Correct! 🎉", duration: 1000 });
    }
  }, [activeWord, vocabulary, audio, toast]);

  const handleIncorrect = useCallback(() => {
    if (activeWord) {
      vocabulary.markIncorrect(activeWord.id);
      audio.playSoundEffect("incorrect");
      toast({ title: "Keep practicing! 💪", duration: 1000 });
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

  // Calculate favorites count
  const favoritesCount = vocabulary.words.filter((w) => w.favorite).length;

  if (!activeWord) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">No vocabulary loaded</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container max-w-5xl mx-auto px-4 py-4">
        {/* Top Toolbar */}
        <TopToolbar
          deckName={vocabulary.currentDeck.name}
          decks={vocabulary.decks}
          currentDeckId={vocabulary.currentDeckId}
          onDeckChange={vocabulary.setCurrentDeckId}
          onImport={handleImport}
          favoritesCount={favoritesCount}
          elapsedTime={studySession.formattedTime}
          completionPercentage={studySession.completionPercentage}
          showPinyin={showPinyin}
          onTogglePinyin={() => setShowPinyin(!showPinyin)}
          showChineseFirst={showChineseFirst}
          onToggleChineseFirst={() => setShowChineseFirst(!showChineseFirst)}
          fontSize={fontSize}
          onFontSizeChange={setFontSize}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
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
          autoplayMode={studySession.autoplayMode}
          onAutoplayModeChange={studySession.setAutoplayMode}
          isAutoplayActive={studySession.isAutoplayActive}
          onToggleAutoplay={() =>
            studySession.setAutoplayMode(
              studySession.autoplayMode === "off" ? "chinese" : "off"
            )
          }
          nextDelay={nextDelay}
          onNextDelayChange={setNextDelay}
          languageGap={languageGap}
          onLanguageGapChange={setLanguageGap}
        />

        {/* Progress Bar */}
        <div className="mt-4">
          <ProgressBar
            current={studySession.currentIndex}
            total={vocabulary.words.length}
            percentage={studySession.completionPercentage}
            onSeek={studySession.goToIndex}
            correctCount={vocabulary.words.filter((w) => w.correctCount > 0).length}
            incorrectCount={vocabulary.words.filter((w) => w.incorrectCount > 0).length}
          />
        </div>

        {/* Flashcard */}
        <div className="mt-6">
          <Flashcard
            word={activeWord}
            isFlipped={isFlipped}
            onFlip={handleFlip}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onToggleFavorite={() => vocabulary.toggleFavorite(activeWord.id)}
            showPinyin={showPinyin}
            showChineseFirst={showChineseFirst}
            fontSize={fontSize}
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
          />
        </div>

        {/* Navigation */}
        <div className="mt-6">
          <NavigationControls
            onPrevious={handlePrevious}
            onNext={handleNext}
            onFlip={handleFlip}
            onCorrect={handleCorrect}
            onIncorrect={handleIncorrect}
            isFlipped={isFlipped}
          />
        </div>

        {/* Footer */}
        <footer className="text-center mt-8 pb-4">
          <p className="text-sm text-muted-foreground">
            Designed by <span className="font-medium text-foreground">Mido Habibi</span>
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
