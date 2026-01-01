import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ChevronLeft, ChevronRight, Volume2, Play, Pause } from "lucide-react";
import { VocabularyWord, AutoplayMode } from "@/types/vocabulary";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type RepeatMode = "off" | "chinese" | "english" | "chinese-to-english" | "english-to-chinese";

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
  onRepeatChinese: () => Promise<void>;
  onRepeatEnglish: () => Promise<void>;
  onRepeatBoth: () => Promise<void>;
  onRepeatEnglishToChinese: () => Promise<void>;
  // Autoplay props
  autoplayMode: AutoplayMode;
  onAutoplayModeChange: (mode: AutoplayMode) => void;
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
  onRepeatChinese,
  onRepeatEnglish,
  onRepeatBoth,
  onRepeatEnglishToChinese,
  autoplayMode,
  onAutoplayModeChange,
}: FlashcardProps) {
  const [hoveredZone, setHoveredZone] = useState<"left" | "right" | null>(null);
  const [justFavorited, setJustFavorited] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");
  const [isRepeating, setIsRepeating] = useState(false);

  const handleRepeat = async (mode: RepeatMode) => {
    if (mode === "off" || isRepeating) return;
    
    setRepeatMode(mode);
    setIsRepeating(true);
    
    try {
      switch (mode) {
        case "chinese":
          await onRepeatChinese();
          break;
        case "english":
          await onRepeatEnglish();
          break;
        case "chinese-to-english":
          await onRepeatBoth();
          break;
        case "english-to-chinese":
          await onRepeatEnglishToChinese();
          break;
      }
    } finally {
      setIsRepeating(false);
      setRepeatMode("off");
    }
  };

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

  const showFront = showChineseFirst ? !isFlipped : isFlipped;
  const frontContent = showChineseFirst ? (
    <ChineseContent word={word} showPinyin={showPinyin} fontSize={fontSize} onSpeak={onSpeakChinese} />
  ) : (
    <EnglishContent word={word} fontSize={fontSize} onSpeak={onSpeakEnglish} />
  );
  const backContent = showChineseFirst ? (
    <EnglishContent word={word} fontSize={fontSize} onSpeak={onSpeakEnglish} />
  ) : (
    <ChineseContent word={word} showPinyin={showPinyin} fontSize={fontSize} onSpeak={onSpeakChinese} />
  );

  return (
    <div className="perspective-1000 w-full max-w-2xl mx-auto">
      <motion.div
        className="relative w-full aspect-[3/2] cursor-pointer"
        onClick={handleCardClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredZone(null)}
      >
        {/* Navigation zones indicators */}
        <AnimatePresence>
          {hoveredZone === "left" && (
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
          {hoveredZone === "right" && (
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

        {/* 3D Card */}
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
              {showFront ? frontContent : backContent}
              <CardControls
                repeatMode={repeatMode}
                isRepeating={isRepeating}
                onRepeat={handleRepeat}
                autoplayMode={autoplayMode}
                onAutoplayModeChange={onAutoplayModeChange}
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
              {showFront ? backContent : frontContent}
              <CardControls
                repeatMode={repeatMode}
                isRepeating={isRepeating}
                onRepeat={handleRepeat}
                autoplayMode={autoplayMode}
                onAutoplayModeChange={onAutoplayModeChange}
              />
            </div>
          </div>
        </motion.div>
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
  repeatMode,
  isRepeating,
  onRepeat,
  autoplayMode,
  onAutoplayModeChange,
}: {
  repeatMode: RepeatMode;
  isRepeating: boolean;
  onRepeat: (mode: RepeatMode) => void;
  autoplayMode: AutoplayMode;
  onAutoplayModeChange: (mode: AutoplayMode) => void;
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

  return (
    <TooltipProvider>
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-30">
        {/* Repeat Controls */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/70 font-medium">Repeat:</span>
          <div className="flex rounded-lg border border-white/30 overflow-hidden bg-white/10">
            {repeatOptions.map(({ mode, label, tooltip }) => (
              <Tooltip key={mode}>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRepeat(mode);
                    }}
                    disabled={isRepeating}
                    className={cn(
                      "px-2.5 py-1 text-xs font-bold transition-colors border-l border-white/30 first:border-l-0",
                      repeatMode === mode && isRepeating
                        ? "bg-white/40 text-white"
                        : "text-white hover:bg-white/20",
                      isRepeating && repeatMode !== mode && "opacity-50 cursor-not-allowed"
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
        </div>

        {/* Autoplay Controls */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/70 font-medium">Autoplay:</span>
          <div className="flex rounded-lg border border-white/30 overflow-hidden bg-white/10">
            {autoplayOptions.map(({ mode, label, tooltip }) => (
              <Tooltip key={mode}>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAutoplayModeChange(autoplayMode === mode ? "off" : mode);
                    }}
                    className={cn(
                      "px-2.5 py-1 text-xs font-bold transition-colors border-l border-white/30 first:border-l-0",
                      autoplayMode === mode
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
          {autoplayMode !== "off" && (
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
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
