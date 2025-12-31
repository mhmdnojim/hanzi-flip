import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ChevronLeft, ChevronRight, Volume2 } from "lucide-react";
import { VocabularyWord } from "@/types/vocabulary";
import { cn } from "@/lib/utils";

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
  );
}
