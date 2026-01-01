import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ChevronLeft, ChevronRight, Volume2, Play, Pause, Repeat, Plus, Minus } from "lucide-react";
import { VocabularyWord, AutoplayMode } from "@/types/vocabulary";
import { RepeatMode, DisplayMode, RepeatCount } from "@/hooks/useStudySession";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FlashcardProps {
  word: VocabularyWord;
  isFlipped: boolean;
  onFlip: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onToggleFavorite: () => void;
  showPinyin: boolean;
  showChineseFirst: boolean;
  fontSize: number;
  onSpeakChinese: () => void;
  onSpeakEnglish: () => void;
  // Autoplay props
  autoplayMode: AutoplayMode;
  onAutoplayModeChange: (mode: AutoplayMode) => void;
  isAutoplayActive: boolean;
  // Autoplay repeat props
  autoplayRepeatCount: RepeatCount;
  onAutoplayRepeatCountChange: (count: RepeatCount) => void;
  isAutoplayRepeating: boolean;
  onToggleAutoplayRepeat: () => void;
  // Repeat props
  repeatMode: RepeatMode;
  onRepeatModeChange: (mode: RepeatMode) => void;
  isRepeatActive: boolean;
  // Display mode - what to show on card
  displayMode: DisplayMode;
  currentlySpoken: "chinese" | "english" | null;
}

export function Flashcard({
  word,
  isFlipped,
  onFlip,
  onNext,
  onPrevious,
  onToggleFavorite,
  showPinyin,
  showChineseFirst,
  fontSize,
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
}: FlashcardProps) {
  const [hoveredZone, setHoveredZone] = useState<"left" | "right" | null>(null);
  const [justFavorited, setJustFavorited] = useState(false);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite();
    if (!word.favorite) {
      setJustFavorited(true);
      setTimeout(() => setJustFavorited(false), 400);
    }
  };

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Don't handle clicks if autoplay or repeat is active
    if (isAutoplayActive || isRepeatActive) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const percentage = x / width;

    if (percentage < 0.1) {
      onPrevious();
    } else if (percentage > 0.9) {
      onNext();
    } else {
      onFlip();
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isAutoplayActive || isRepeatActive) {
      setHoveredZone(null);
      return;
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const percentage = x / width;

    if (percentage < 0.1) {
      setHoveredZone("left");
    } else if (percentage > 0.9) {
      setHoveredZone("right");
    } else {
      setHoveredZone(null);
    }
  };

  // Determine what content to show based on displayMode
  const getContentToShow = () => {
    // If autoplay or repeat is active, show based on displayMode
    if (isAutoplayActive || isRepeatActive) {
      if (displayMode === "chinese") {
        return {
          showChinese: true,
          showEnglish: false,
        };
      } else if (displayMode === "english") {
        return {
          showChinese: false,
          showEnglish: true,
        };
      }
    }
    
    // Default behavior based on flip state
    const showFront = showChineseFirst ? !isFlipped : isFlipped;
    return {
      showChinese: showChineseFirst ? showFront : !showFront,
      showEnglish: showChineseFirst ? !showFront : showFront,
    };
  };

  const { showChinese, showEnglish } = getContentToShow();

  // For autoplay/repeat mode, we show a single-sided card
  const isPlaybackMode = isAutoplayActive || isRepeatActive;

  return (
    <div className="perspective-1000 w-full max-w-2xl mx-auto">
      <motion.div
        className={cn(
          "relative w-full aspect-[3/2]",
          !isPlaybackMode && "cursor-pointer"
        )}
        onClick={handleCardClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredZone(null)}
      >
        {/* Navigation zones indicators */}
        <AnimatePresence>
          {hoveredZone === "left" && !isPlaybackMode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute left-0 top-0 bottom-0 w-[10%] flex items-center justify-center z-20 pointer-events-none"
            >
              <div className="bg-foreground/10 rounded-full p-3">
                <ChevronLeft className="w-8 h-8 text-foreground" />
              </div>
            </motion.div>
          )}
          {hoveredZone === "right" && !isPlaybackMode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute right-0 top-0 bottom-0 w-[10%] flex items-center justify-center z-20 pointer-events-none"
            >
              <div className="bg-foreground/10 rounded-full p-3">
                <ChevronRight className="w-8 h-8 text-foreground" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Card - single view for playback, 3D flip for manual */}
        {isPlaybackMode ? (
          // Single-sided card for playback mode
          <div className={cn(
            "w-full h-full rounded-2xl shadow-2xl p-8 flex flex-col items-center justify-center relative overflow-hidden",
            showChinese ? "gradient-primary" : "gradient-accent"
          )}>
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
            <FavoriteButton
              isFavorite={word.favorite}
              onClick={handleFavoriteClick}
              justFavorited={justFavorited}
            />
            
            {/* Speaking indicator */}
            {currentlySpoken && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute top-4 left-4 flex items-center gap-2 bg-white/20 rounded-full px-3 py-1"
              >
                <Volume2 className="w-4 h-4 text-white animate-pulse" />
                <span className="text-xs text-white font-medium">
                  {currentlySpoken === "chinese" ? "Speaking Chinese" : "Speaking English"}
                </span>
              </motion.div>
            )}
            
            {showChinese ? (
              <ChineseContent word={word} showPinyin={showPinyin} fontSize={fontSize} onSpeak={onSpeakChinese} />
            ) : (
              <EnglishContent word={word} fontSize={fontSize} onSpeak={onSpeakEnglish} />
            )}
            
            <CardControls
              autoplayMode={autoplayMode}
              onAutoplayModeChange={onAutoplayModeChange}
              isAutoplayActive={isAutoplayActive}
              autoplayRepeatCount={autoplayRepeatCount}
              onAutoplayRepeatCountChange={onAutoplayRepeatCountChange}
              isAutoplayRepeating={isAutoplayRepeating}
              onToggleAutoplayRepeat={onToggleAutoplayRepeat}
              repeatMode={repeatMode}
              onRepeatModeChange={onRepeatModeChange}
              isRepeatActive={isRepeatActive}
            />
          </div>
        ) : (
          // 3D flip card for manual mode
          <motion.div
            className="relative w-full h-full preserve-3d"
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
          >
            {/* Front */}
            <div className="absolute inset-0 backface-hidden">
              <div className="w-full h-full rounded-2xl gradient-primary shadow-2xl p-8 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
                <FavoriteButton
                  isFavorite={word.favorite}
                  onClick={handleFavoriteClick}
                  justFavorited={justFavorited}
                />
                {showChineseFirst ? (
                  <ChineseContent word={word} showPinyin={showPinyin} fontSize={fontSize} onSpeak={onSpeakChinese} />
                ) : (
                  <EnglishContent word={word} fontSize={fontSize} onSpeak={onSpeakEnglish} />
                )}
                <CardControls
                  autoplayMode={autoplayMode}
                  onAutoplayModeChange={onAutoplayModeChange}
                  isAutoplayActive={isAutoplayActive}
                  autoplayRepeatCount={autoplayRepeatCount}
                  onAutoplayRepeatCountChange={onAutoplayRepeatCountChange}
                  isAutoplayRepeating={isAutoplayRepeating}
                  onToggleAutoplayRepeat={onToggleAutoplayRepeat}
                  repeatMode={repeatMode}
                  onRepeatModeChange={onRepeatModeChange}
                  isRepeatActive={isRepeatActive}
                />
              </div>
            </div>

            {/* Back */}
            <div className="absolute inset-0 backface-hidden rotate-y-180">
              <div className="w-full h-full rounded-2xl gradient-accent shadow-2xl p-8 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
                <FavoriteButton
                  isFavorite={word.favorite}
                  onClick={handleFavoriteClick}
                  justFavorited={justFavorited}
                />
                {showChineseFirst ? (
                  <EnglishContent word={word} fontSize={fontSize} onSpeak={onSpeakEnglish} />
                ) : (
                  <ChineseContent word={word} showPinyin={showPinyin} fontSize={fontSize} onSpeak={onSpeakChinese} />
                )}
                <CardControls
                  autoplayMode={autoplayMode}
                  onAutoplayModeChange={onAutoplayModeChange}
                  isAutoplayActive={isAutoplayActive}
                  autoplayRepeatCount={autoplayRepeatCount}
                  onAutoplayRepeatCountChange={onAutoplayRepeatCountChange}
                  isAutoplayRepeating={isAutoplayRepeating}
                  onToggleAutoplayRepeat={onToggleAutoplayRepeat}
                  repeatMode={repeatMode}
                  onRepeatModeChange={onRepeatModeChange}
                  isRepeatActive={isRepeatActive}
                />
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

function ChineseContent({
  word,
  showPinyin,
  fontSize,
  onSpeak,
}: {
  word: VocabularyWord;
  showPinyin: boolean;
  fontSize: number;
  onSpeak: () => void;
}) {
  return (
    <div className="text-center z-10 flex flex-col items-center gap-2">
      {showPinyin && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl md:text-2xl text-white/80 font-medium"
        >
          {word.pinyin}
        </motion.p>
      )}
      <p
        className="font-chinese text-white font-bold leading-tight"
        style={{ fontSize: `${fontSize}px` }}
      >
        {word.chinese}
      </p>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSpeak();
        }}
        className="mt-4 p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
      >
        <Volume2 className="w-6 h-6 text-white" />
      </button>
    </div>
  );
}

function EnglishContent({
  word,
  fontSize,
  onSpeak,
}: {
  word: VocabularyWord;
  fontSize: number;
  onSpeak: () => void;
}) {
  return (
    <div className="text-center z-10 flex flex-col items-center gap-2">
      <p
        className="font-body text-foreground font-bold leading-tight"
        style={{ fontSize: `${Math.min(fontSize, 80)}px` }}
      >
        {word.english}
      </p>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSpeak();
        }}
        className="mt-4 p-3 rounded-full bg-foreground/10 hover:bg-foreground/20 transition-colors"
      >
        <Volume2 className="w-6 h-6 text-foreground" />
      </button>
    </div>
  );
}

function FavoriteButton({
  isFavorite,
  onClick,
  justFavorited,
}: {
  isFavorite?: boolean;
  onClick: (e: React.MouseEvent) => void;
  justFavorited: boolean;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={cn(
              "absolute top-4 right-4 p-2 rounded-full transition-all z-30",
              isFavorite
                ? "bg-destructive/20 text-destructive"
                : "bg-white/20 text-white/60 hover:text-white"
            )}
          >
            <Heart
              className={cn(
                "w-6 h-6 transition-transform",
                isFavorite && "fill-current",
                justFavorited && "animate-pulse-favorite"
              )}
            />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isFavorite ? "Remove from favorites" : "Add to favorites"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function CardControls({
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
}: {
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
}) {
  const repeatOptions = [
    { mode: "chinese" as RepeatMode, label: "中", tooltip: "Repeat Chinese only" },
    { mode: "english" as RepeatMode, label: "EN", tooltip: "Repeat English only" },
    { mode: "chinese-to-english" as RepeatMode, label: "中→EN", tooltip: "Repeat Chinese then English" },
    { mode: "english-to-chinese" as RepeatMode, label: "EN→中", tooltip: "Repeat English then Chinese" },
  ];

  const autoplayOptions = [
    { mode: "chinese" as AutoplayMode, label: "中", tooltip: "Autoplay Chinese only" },
    { mode: "english" as AutoplayMode, label: "EN", tooltip: "Autoplay English only" },
    { mode: "chinese-to-english" as AutoplayMode, label: "中→EN", tooltip: "Autoplay Chinese then English" },
    { mode: "english-to-chinese" as AutoplayMode, label: "EN→中", tooltip: "Autoplay English then Chinese" },
  ];

  const handleIncreaseRepeatCount = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAutoplayRepeatCountChange(autoplayRepeatCount + 1);
  };

  const handleDecreaseRepeatCount = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (autoplayRepeatCount > 0) {
      onAutoplayRepeatCountChange(autoplayRepeatCount - 1);
    }
  };

  return (
    <TooltipProvider>
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-30">
        {/* Repeat Controls */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/70 font-medium">Repeat:</span>
          <div className={cn(
            "flex rounded-lg border overflow-hidden",
            isRepeatActive 
              ? "border-emerald-400 bg-emerald-500/20" 
              : "border-white/30 bg-white/10"
          )}>
            {repeatOptions.map(({ mode, label, tooltip }) => (
              <Tooltip key={mode}>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Toggle: if same mode clicked, turn off; otherwise activate new mode
                      onRepeatModeChange(repeatMode === mode ? "off" : mode);
                    }}
                    className={cn(
                      "px-2.5 py-1 text-xs font-bold transition-colors border-l border-white/30 first:border-l-0",
                      repeatMode === mode && isRepeatActive
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
          {isRepeatActive && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRepeatModeChange("off");
                  }}
                  className="p-1.5 rounded-full bg-red-500/80 hover:bg-red-500 text-white transition-colors"
                >
                  <Pause className="w-3 h-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Stop repeat</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Autoplay Controls */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/70 font-medium">Autoplay:</span>
          <div className={cn(
            "flex rounded-lg border overflow-hidden",
            isAutoplayActive 
              ? "border-emerald-400 bg-emerald-500/20" 
              : "border-white/30 bg-white/10"
          )}>
            {autoplayOptions.map(({ mode, label, tooltip }) => (
              <Tooltip key={mode}>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // Toggle: if same mode clicked, turn off; otherwise activate new mode
                      onAutoplayModeChange(autoplayMode === mode ? "off" : mode);
                    }}
                    className={cn(
                      "px-2.5 py-1 text-xs font-bold transition-colors border-l border-white/30 first:border-l-0",
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
          
          {/* Repeat button + count selector for autoplay - show when any autoplay mode is selected */}
          {isAutoplayActive && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleAutoplayRepeat();
                    }}
                    className={cn(
                      "p-1.5 rounded-full transition-colors",
                      isAutoplayRepeating
                        ? "bg-amber-500 text-white"
                        : "bg-white/20 text-white hover:bg-white/30"
                    )}
                  >
                    <Repeat className="w-3 h-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isAutoplayRepeating ? "Stop repeating current word" : "Repeat current word"}</p>
                </TooltipContent>
              </Tooltip>

              {/* Repeat count with +/- buttons */}
              <div className={cn(
                "flex items-center rounded-lg border overflow-hidden",
                isAutoplayRepeating 
                  ? "border-amber-400 bg-amber-500/20" 
                  : "border-white/30 bg-white/10"
              )}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleDecreaseRepeatCount}
                      className="px-1.5 py-1 text-white hover:bg-white/20 transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Decrease repeat count</p>
                  </TooltipContent>
                </Tooltip>
                
                <span className="px-2 py-1 text-xs font-bold text-white min-w-[28px] text-center border-x border-white/30">
                  {autoplayRepeatCount === 0 ? "∞" : autoplayRepeatCount}
                </span>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleIncreaseRepeatCount}
                      className="px-1.5 py-1 text-white hover:bg-white/20 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Increase repeat count</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAutoplayModeChange("off");
                    }}
                    className="p-1.5 rounded-full bg-red-500/80 hover:bg-red-500 text-white transition-colors"
                  >
                    <Pause className="w-3 h-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Stop autoplay</p>
                </TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
