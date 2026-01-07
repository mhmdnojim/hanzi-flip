import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Heart, 
  ChevronLeft, 
  ChevronRight, 
  Volume2,
  Repeat, 
  Plus, 
  Minus,
  Sun,
  Moon,
  Star,
  Timer,
  Check,
  X,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { VocabularyWord, AutoplayMode } from "@/types/vocabulary";
import { RepeatMode, DisplayMode, RepeatCount } from "@/hooks/useStudySession";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FlashcardViewProps {
  word: VocabularyWord;
  isFlipped: boolean;
  onFlip: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onToggleFavorite: () => void;
  showPinyin: boolean;
  showChineseFirst: boolean;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  onSpeakChinese: () => void;
  onSpeakEnglish: () => void;
  // Autoplay props
  autoplayMode: AutoplayMode;
  onAutoplayModeChange: (mode: AutoplayMode) => void;
  isAutoplayActive: boolean;
  autoplayRepeatCount: RepeatCount;
  onAutoplayRepeatCountChange: (count: RepeatCount) => void;
  isAutoplayRepeating: boolean;
  onToggleAutoplayRepeat: () => void;
  repeatMode: RepeatMode;
  onRepeatModeChange: (mode: RepeatMode) => void;
  isRepeatActive: boolean;
  displayMode: DisplayMode;
  currentlySpoken: "chinese" | "english" | null;
  // Progress
  currentIndex: number;
  totalWords: number;
  percentage: number;
  onSeek: (index: number) => void;
  correctCount: number;
  incorrectCount: number;
  // Stats
  favoritesCount: number;
  elapsedTime: string;
  completionPercentage: number;
  // Timing
  nextDelay: number;
  onNextDelayChange: (delay: number) => void;
  languageGap: number;
  onLanguageGapChange: (gap: number) => void;
  // Theme
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  // Scoring
  onCorrect: () => void;
  onIncorrect: () => void;
}

export function FlashcardView({
  word,
  isFlipped,
  onFlip,
  onNext,
  onPrevious,
  onToggleFavorite,
  showPinyin,
  showChineseFirst,
  fontSize,
  onFontSizeChange,
  onSpeakChinese,
  onSpeakEnglish,
  autoplayMode,
  onAutoplayModeChange,
  isAutoplayActive,
  autoplayRepeatCount,
  onAutoplayRepeatCountChange,
  isAutoplayRepeating,
  onToggleAutoplayRepeat,
  repeatMode,
  onRepeatModeChange,
  isRepeatActive,
  displayMode,
  currentlySpoken,
  currentIndex,
  totalWords,
  percentage,
  onSeek,
  correctCount,
  incorrectCount,
  favoritesCount,
  elapsedTime,
  completionPercentage,
  nextDelay,
  onNextDelayChange,
  languageGap,
  onLanguageGapChange,
  isDarkMode,
  onToggleDarkMode,
  onCorrect,
  onIncorrect,
}: FlashcardViewProps) {
  const [hoveredZone, setHoveredZone] = useState<"left" | "right" | null>(null);
  const [justFavorited, setJustFavorited] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite();
    if (!word.favorite) {
      setJustFavorited(true);
      setTimeout(() => setJustFavorited(false), 400);
    }
  };

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const pct = x / width;

    if (pct < 0.1) {
      onPrevious();
    } else if (pct > 0.9) {
      onNext();
    } else if (!isAutoplayActive && !isRepeatActive) {
      // Just flip the card, no sound
      onFlip();
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const pct = x / width;

    if (pct < 0.1) {
      setHoveredZone("left");
    } else if (pct > 0.9) {
      setHoveredZone("right");
    } else {
      setHoveredZone(null);
    }
  };

  const getContentToShow = () => {
    if (isAutoplayActive || isRepeatActive) {
      if (displayMode === "chinese") {
        return { showChinese: true, showEnglish: false };
      } else if (displayMode === "english") {
        return { showChinese: false, showEnglish: true };
      }
    }
    // When showChineseFirst is true: front=Chinese, back=English
    // When showChineseFirst is false: front=English, back=Chinese
    if (showChineseFirst) {
      return {
        showChinese: !isFlipped,
        showEnglish: isFlipped,
      };
    } else {
      return {
        showChinese: isFlipped,
        showEnglish: !isFlipped,
      };
    }
  };

  const { showChinese, showEnglish } = getContentToShow();
  const isPlaybackMode = isAutoplayActive || isRepeatActive;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newPercentage = x / rect.width;
    const newIndex = Math.round(newPercentage * (totalWords - 1));
    onSeek(newIndex);
  };

  const handleProgressDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const newPercentage = x / rect.width;
    const newIndex = Math.round(newPercentage * (totalWords - 1));
    onSeek(newIndex);
  };

  const autoplayOptions = [
    { mode: "chinese" as AutoplayMode, label: "中", tooltip: "Autoplay Chinese only" },
    { mode: "english" as AutoplayMode, label: "EN", tooltip: "Autoplay English only" },
    { mode: "chinese-to-english" as AutoplayMode, label: "中→EN", tooltip: "Chinese then English" },
    { mode: "english-to-chinese" as AutoplayMode, label: "EN→中", tooltip: "English then Chinese" },
  ];

  return (
    <TooltipProvider delayDuration={200}>
      <div className="w-full h-full flex flex-col">
        {/* Main Card Container - Taller min-height */}
        <motion.div
          className="relative w-full flex-1 min-h-[65vh] sm:min-h-[75vh] cursor-pointer rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl"
          onClick={handleCardClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredZone(null)}
          style={{
            background: showChinese 
              ? "linear-gradient(135deg, hsl(340, 82%, 52%) 0%, hsl(280, 60%, 55%) 100%)"
              : "linear-gradient(135deg, hsl(280, 60%, 55%) 0%, hsl(220, 70%, 50%) 100%)",
          }}
        >
          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />

          {/* Top Left: Dark Mode Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleDarkMode();
                }}
                className="absolute top-3 left-3 sm:top-4 sm:left-4 p-2 sm:p-2.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors z-30"
              >
                {isDarkMode ? (
                  <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                ) : (
                  <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isDarkMode ? "Switch to light mode" : "Switch to dark mode"}</p>
            </TooltipContent>
          </Tooltip>

          {/* Top Center: Stats (Time, Favorites, Percentage) */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 sm:top-4 flex items-center gap-2 sm:gap-4 z-20">
            <div className="flex items-center gap-1 sm:gap-1.5 text-white/90 text-xs sm:text-sm bg-white/10 rounded-full px-2 sm:px-3 py-1">
              <Timer className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>{elapsedTime}</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5 text-amber-300 text-xs sm:text-sm bg-white/10 rounded-full px-2 sm:px-3 py-1">
              <Star className="w-3 h-3 sm:w-4 sm:h-4 fill-current" />
              <span>{favoritesCount}</span>
            </div>
          <div className={cn(
              "text-xs sm:text-sm font-medium bg-white/10 rounded-full px-2 sm:px-3 py-1",
              completionPercentage < 30 && "text-orange-300",
              completionPercentage >= 30 && completionPercentage < 70 && "text-blue-300",
              completionPercentage >= 70 && "text-emerald-300"
            )}>
              {Math.round(completionPercentage)}%
            </div>
          </div>

          {/* Top Right: Favorite + Scoring */}
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex items-center gap-1.5 sm:gap-2 z-30">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onIncorrect();
                  }}
                  className={cn(
                    "p-1.5 sm:p-2 rounded-full transition-colors",
                    (word.incorrectCount || 0) > 0
                      ? "bg-rose-500/80 ring-2 ring-white/40"
                      : "bg-rose-500/30 hover:bg-rose-500/50"
                  )}
                >
                  <ThumbsDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{(word.incorrectCount || 0) > 0 ? "Remove incorrect" : "Mark as incorrect"}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCorrect();
                  }}
                  className={cn(
                    "p-1.5 sm:p-2 rounded-full transition-colors",
                    (word.correctCount || 0) > 0
                      ? "bg-emerald-500/80 ring-2 ring-white/40"
                      : "bg-emerald-500/30 hover:bg-emerald-500/50"
                  )}
                >
                  <ThumbsUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{(word.correctCount || 0) > 0 ? "Remove correct" : "Mark as correct"}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleFavoriteClick}
                  className={cn(
                    "p-1.5 sm:p-2 rounded-full transition-all",
                    word.favorite
                      ? "bg-rose-500/30 text-rose-300"
                      : "bg-white/20 text-white/60 hover:text-white"
                  )}
                >
                  <Heart
                    className={cn(
                      "w-4 h-4 sm:w-5 sm:h-5 transition-transform",
                      word.favorite && "fill-current",
                      justFavorited && "animate-pulse"
                    )}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{word.favorite ? "Remove from favorites" : "Add to favorites"}</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Navigation Zones - Always visible at low opacity, full on hover */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: hoveredZone === "left" ? 1 : 0.4 }}
            className="absolute left-0 top-0 bottom-0 w-[10%] flex items-center justify-center z-20 pointer-events-none"
          >
            <div className="bg-black/20 rounded-full p-2 sm:p-3">
              <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: hoveredZone === "right" ? 1 : 0.4 }}
            className="absolute right-0 top-0 bottom-0 w-[10%] flex items-center justify-center z-20 pointer-events-none"
          >
            <div className="bg-black/20 rounded-full p-2 sm:p-3">
              <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
          </motion.div>

          {/* Speaking indicator */}
          {currentlySpoken && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-12 sm:top-14 left-3 sm:left-4 flex items-center gap-2 bg-white/20 rounded-full px-2 sm:px-3 py-1 z-20"
            >
              <Volume2 className="w-3 h-3 sm:w-4 sm:h-4 text-white animate-pulse" />
              <span className="text-[10px] sm:text-xs text-white font-medium">
                {currentlySpoken === "chinese" ? "Speaking Chinese" : "Speaking English"}
              </span>
            </motion.div>
          )}

          {/* Card Content - Centered with Flip Animation */}
          <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-8" style={{ perspective: "1000px" }}>
            <motion.div
              key={`${word.id}-${showChinese ? 'chinese' : 'english'}`}
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: -90, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              style={{ transformStyle: "preserve-3d" }}
              className="text-center z-10 flex flex-col items-center gap-2"
            >
              {showChinese ? (
                <>
                  {showPinyin && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-lg sm:text-xl md:text-2xl text-white/80 font-medium"
                    >
                      {word.pinyin}
                    </motion.p>
                  )}
                  <p
                    className="font-chinese text-white font-bold leading-tight"
                    style={{ fontSize: `clamp(32px, ${fontSize}px, ${fontSize}px)` }}
                  >
                    {word.chinese}
                  </p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSpeakChinese();
                        }}
                        className="mt-3 p-2 sm:p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                      >
                        <Volume2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Speak Chinese</p>
                    </TooltipContent>
                  </Tooltip>
                </>
              ) : (
                <>
                  <p
                    className="font-body text-white font-bold leading-tight px-4"
                    style={{ fontSize: `clamp(24px, ${Math.min(fontSize, 80)}px, ${Math.min(fontSize, 80)}px)` }}
                  >
                    {word.english}
                  </p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSpeakEnglish();
                        }}
                        className="mt-3 p-2 sm:p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                      >
                        <Volume2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Speak English</p>
                    </TooltipContent>
                  </Tooltip>
                </>
              )}
            </motion.div>
          </div>

          {/* Bottom Section: Controls inside card */}
          <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 z-30 bg-gradient-to-t from-black/30 to-transparent">
            {/* Right: Timing + Font Controls - Above autoplay row */}
            <div className="flex justify-end mb-2">
              <div className="flex flex-col gap-1.5 sm:gap-2 items-end">
                {/* Font size */}
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <span className="text-[10px] sm:text-xs text-white/70">Font:</span>
                  <div className="w-12 sm:w-16">
                    <Slider
                      value={[fontSize]}
                      min={48}
                      max={150}
                      step={4}
                      onValueChange={([v]) => onFontSizeChange(v)}
                      onClick={(e) => e.stopPropagation()}
                      className="accent-violet-500"
                    />
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium text-white w-8 text-right">{fontSize}px</span>
                </div>

                {/* Next translation delay (gap between languages) */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      <span className="text-[10px] sm:text-xs text-white/70 whitespace-nowrap">Trans:</span>
                      <div className="w-12 sm:w-16">
                        <Slider
                          value={[languageGap]}
                          min={0.5}
                          max={5}
                          step={0.5}
                          onValueChange={([v]) => onLanguageGapChange(v)}
                          onClick={(e) => e.stopPropagation()}
                          className="accent-amber-500"
                        />
                      </div>
                      <span className="text-[10px] sm:text-xs font-medium text-white w-8 text-right">{languageGap}s</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Delay between languages (translation gap)</p>
                  </TooltipContent>
                </Tooltip>

                {/* Next word delay */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      <span className="text-[10px] sm:text-xs text-white/70 whitespace-nowrap">Next:</span>
                      <div className="w-12 sm:w-16">
                        <Slider
                          value={[nextDelay]}
                          min={1}
                          max={10}
                          step={0.5}
                          onValueChange={([v]) => onNextDelayChange(v)}
                          onClick={(e) => e.stopPropagation()}
                          className="accent-primary"
                        />
                      </div>
                      <span className="text-[10px] sm:text-xs font-medium text-white w-8 text-right">{nextDelay}s</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Delay before moving to next word</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Autoplay Controls Row */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="text-[10px] sm:text-xs text-white/70 font-medium">Autoplay:</span>
              <div className="flex rounded-lg border border-white/30 bg-white/10 overflow-hidden">
                {autoplayOptions.map(({ mode, label, tooltip }) => (
                  <Tooltip key={mode}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();

                          // Toggle off if pressing the same active mode
                          if (autoplayMode === mode && isAutoplayActive) {
                            onAutoplayModeChange("off");
                            return;
                          }

                          // If user presses Chinese then English -> Chinese→English
                          if (autoplayMode === "chinese" && mode === "english") {
                            onAutoplayModeChange("chinese-to-english");
                            return;
                          }

                          // If user presses English then Chinese -> English→Chinese
                          if (autoplayMode === "english" && mode === "chinese") {
                            onAutoplayModeChange("english-to-chinese");
                            return;
                          }

                          // Otherwise: set requested mode
                          onAutoplayModeChange(mode);
                        }}
                        className={cn(
                          "px-1.5 sm:px-2.5 py-1 text-[10px] sm:text-xs font-bold transition-colors border-l border-white/30 first:border-l-0",
                          autoplayMode === mode && isAutoplayActive
                            ? "bg-emerald-500 text-white"
                            : "text-white hover:bg-white/20"
                        )}
                      >
                        {label}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>

              {/* Repeat (only works when autoplay is active) */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isAutoplayActive) onToggleAutoplayRepeat();
                    }}
                    disabled={!isAutoplayActive}
                    className={cn(
                      "p-1 sm:p-1.5 rounded-full transition-colors",
                      !isAutoplayActive
                        ? "bg-white/10 text-white/40 cursor-not-allowed"
                        : isAutoplayRepeating
                          ? "bg-amber-500 text-white"
                          : "bg-white/20 text-white hover:bg-white/30"
                    )}
                  >
                    <Repeat className="w-3 h-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {!isAutoplayActive
                      ? "Select autoplay mode first"
                      : isAutoplayRepeating
                        ? "Stop repeating"
                        : "Repeat current word"}
                  </p>
                </TooltipContent>
              </Tooltip>

              {/* Repeat count */}
              <div
                className={cn(
                  "flex items-center rounded-lg border overflow-hidden",
                  !isAutoplayActive ? "border-white/20 bg-white/5" : "border-white/30 bg-white/10"
                )}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isAutoplayActive) return;
                    if (autoplayRepeatCount > 0) onAutoplayRepeatCountChange(autoplayRepeatCount - 1);
                  }}
                  disabled={!isAutoplayActive}
                  className={cn(
                    "px-1 sm:px-1.5 py-0.5 sm:py-1 transition-colors",
                    !isAutoplayActive ? "text-white/40 cursor-not-allowed" : "text-white hover:bg-white/20"
                  )}
                >
                  <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                </button>
                <span
                  className={cn(
                    "px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold min-w-[20px] sm:min-w-[28px] text-center border-x",
                    !isAutoplayActive ? "text-white/40 border-white/20" : "text-white border-white/30"
                  )}
                >
                  {autoplayRepeatCount === 0 ? "∞" : autoplayRepeatCount}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isAutoplayActive) return;
                    onAutoplayRepeatCountChange(autoplayRepeatCount + 1);
                  }}
                  disabled={!isAutoplayActive}
                  className={cn(
                    "px-1 sm:px-1.5 py-0.5 sm:py-1 transition-colors",
                    !isAutoplayActive ? "text-white/40 cursor-not-allowed" : "text-white hover:bg-white/20"
                  )}
                >
                  <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Progress Bar - Outside card, 2px below */}
        <div className="mt-[2px] px-3 sm:px-4 space-y-1">
          <div className="flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground">
            <span>{currentIndex + 1} / {totalWords}</span>
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="flex items-center gap-1 text-emerald-500 font-medium">
                <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                {correctCount}
              </span>
              <span className="flex items-center gap-1 text-rose-500 font-medium">
                <X className="w-3 h-3 sm:w-4 sm:h-4" />
                {incorrectCount}
              </span>
            </div>
          </div>
          <div
            className="relative h-2 sm:h-3 bg-muted rounded-full cursor-pointer overflow-hidden"
            onClick={handleProgressClick}
            onMouseDown={(e) => {
              e.stopPropagation();
              setIsDragging(true);
            }}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
            onMouseMove={handleProgressDrag}
          >
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-primary/80 to-primary/60 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
            <motion.div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 bg-primary rounded-full shadow-lg cursor-grab active:cursor-grabbing"
              style={{ left: `calc(${percentage}% - 8px)` }}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
            />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
