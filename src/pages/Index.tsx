import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Flashcard } from "@/components/Flashcard";
import { ProgressBar } from "@/components/ProgressBar";
import { Toolbar } from "@/components/Toolbar";
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

  const currentWord = vocabulary.words[0];

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
    audio.playSoundEffect("flip");
  }, [audio]);

  const studySession = useStudySession({
    totalWords: vocabulary.words.length,
    onNext: () => {
      setIsFlipped(false);
    },
    onFlip: handleFlip,
    speakChinese: audio.speakChinese,
    speakEnglish: audio.speakEnglish,
    getCurrentWord: () => vocabulary.words[studySession.currentIndex] || null,
    isFlipped,
  });

  const activeWord = vocabulary.words[studySession.currentIndex];

  const handleNext = useCallback(() => {
    studySession.goToNext();
    setIsFlipped(false);
    audio.playSoundEffect("navigate");
  }, [studySession, audio]);

  const handlePrevious = useCallback(() => {
    studySession.goToPrevious();
    setIsFlipped(false);
    audio.playSoundEffect("navigate");
  }, [studySession, audio]);

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

  if (!activeWord) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">No vocabulary loaded</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-gradient mb-2">
            Chinese Flashcards
          </h1>
          <p className="text-muted-foreground">
            {vocabulary.currentDeck.name} • {vocabulary.words.length} words
          </p>
        </motion.header>

        <div className="grid lg:grid-cols-[1fr_320px] gap-8">
          {/* Main Content */}
          <div className="space-y-6">
            {/* Stats */}
            <StudyStats words={vocabulary.words} elapsedTime={studySession.formattedTime} />

            {/* Progress */}
            <ProgressBar
              current={studySession.currentIndex}
              total={vocabulary.words.length}
              percentage={studySession.completionPercentage}
              onSeek={studySession.goToIndex}
            />

            {/* Flashcard */}
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
            />

            {/* Navigation */}
            <NavigationControls
              onPrevious={handlePrevious}
              onNext={handleNext}
              onFlip={handleFlip}
              onCorrect={handleCorrect}
              onIncorrect={handleIncorrect}
              isFlipped={isFlipped}
            />
          </div>

          {/* Sidebar Toolbar */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
              <h2 className="font-semibold text-lg mb-4 text-card-foreground">Settings</h2>
              <Toolbar
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
                voiceSpeed={audio.voiceSpeed}
                onVoiceSpeedChange={audio.setVoiceSpeed}
                voiceMuted={audio.voiceMuted}
                onToggleVoiceMuted={() => audio.setVoiceMuted(!audio.voiceMuted)}
                sfxMuted={audio.sfxMuted}
                onToggleSfxMuted={() => audio.setSfxMuted(!audio.sfxMuted)}
                autoplayMode={studySession.autoplayMode}
                onAutoplayModeChange={studySession.setAutoplayMode}
                nextDelay={studySession.nextDelay}
                onNextDelayChange={studySession.setNextDelay}
                languageGap={studySession.languageGap}
                onLanguageGapChange={studySession.setLanguageGap}
                isShuffled={vocabulary.isShuffled}
                onShuffle={handleShuffle}
                onResetOrder={vocabulary.resetOrder}
                onResetProgress={vocabulary.resetProgress}
                decks={vocabulary.decks}
                currentDeckId={vocabulary.currentDeckId}
                onDeckChange={vocabulary.setCurrentDeckId}
                onImport={handleImport}
                onExportFavorites={vocabulary.exportFavorites}
                onExportProgress={vocabulary.exportProgressCSV}
                storageMode={vocabulary.storageMode}
                onStorageModeChange={vocabulary.setStorageMode}
              />
            </div>
          </aside>
        </div>

        {/* Footer */}
        <footer className="text-center mt-12 pb-6">
          <p className="text-sm text-muted-foreground">
            This app designed by <span className="font-medium text-foreground">Mido Habibi</span>
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
