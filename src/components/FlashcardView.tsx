import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Heart, ChevronLeft, ChevronRight, Volume2,
  Repeat, Plus, Minus, Sun, Moon, Star, Timer,
  Check, X, ThumbsUp, ThumbsDown,
  Quote, MessageSquareText, MessageSquareOff,
  Pause, Play, ArrowUp, ArrowDown, Trash2, Settings2, List,
  Save, Sparkles, Loader2, ChevronDown,
} from "lucide-react";
import {
  VocabularyWord, AutoplayMode,
  CustomSequenceStep, CustomSequenceTrack,
} from "@/types/vocabulary";
import { RepeatMode, DisplayMode, RepeatCount } from "@/hooks/useStudySession";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { sequenceSignature, type SequencePreset } from "@/lib/sequencePresets";

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
  currentIndex: number;
  totalWords: number;
  percentage: number;
  onSeek: (index: number) => void;
  correctCount: number;
  incorrectCount: number;
  favoritesCount: number;
  elapsedTime: string;
  completionPercentage: number;
  nextDelay: number;
  onNextDelayChange: (delay: number) => void;
  languageGap: number;
  onLanguageGapChange: (gap: number) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onCorrect: () => void;
  onIncorrect: () => void;

  // ── New SyncScript-ported features ──
  /** Optional language label for the "Original" side (e.g. "Chinese", "Arabic"). Defaults to "Original". */
  originalLabel?: string;
  /** Optional language label for the "Translation" side. Defaults to "Translation". */
  translationLabel?: string;
  /** Speak the example sentence (in original language) */
  onSpeakExample: () => void;
  includeExample: boolean;
  onIncludeExampleChange: (v: boolean) => void;
  customSequence: CustomSequenceStep[];
  onCustomSequenceChange: (seq: CustomSequenceStep[]) => void;
  sequencePresets: SequencePreset[];
  activePresetId: string | null;
  onSelectPreset: (id: string) => void;
  onSaveAsPreset: (name: string) => void;
  onUpdateActivePreset: () => void;
  onRenameActivePreset: (newName: string) => void;
  onDeleteActivePreset: () => void;
  onOpenWordList: () => void;
  onGenerateExamples: () => void;
  isGeneratingExamples: boolean;
}

export function FlashcardView(props: FlashcardViewProps) {
  const {
    word, isFlipped, onFlip, onNext, onPrevious, onToggleFavorite,
    showPinyin, showChineseFirst, fontSize, onFontSizeChange,
    onSpeakChinese, onSpeakEnglish,
    autoplayMode, onAutoplayModeChange, isAutoplayActive,
    autoplayRepeatCount, onAutoplayRepeatCountChange,
    isAutoplayRepeating, onToggleAutoplayRepeat,
    repeatMode, isRepeatActive,
    displayMode, currentlySpoken,
    currentIndex, totalWords, percentage, onSeek,
    correctCount, incorrectCount,
    favoritesCount, elapsedTime, completionPercentage,
    nextDelay, onNextDelayChange, languageGap, onLanguageGapChange,
    isDarkMode, onToggleDarkMode,
    onCorrect, onIncorrect,
    originalLabel = "Original",
    translationLabel = "Translation",
    onSpeakExample, includeExample, onIncludeExampleChange,
    customSequence, onCustomSequenceChange,
    sequencePresets, activePresetId,
    onSelectPreset, onSaveAsPreset, onUpdateActivePreset,
    onRenameActivePreset, onDeleteActivePreset,
    onOpenWordList, onGenerateExamples, isGeneratingExamples,
  } = props;

  const [hoveredZone, setHoveredZone] = useState<"left" | "right" | null>(null);
  const [justFavorited, setJustFavorited] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [userFlipOverride, setUserFlipOverride] = useState(false);
  const [showSequenceEditor, setShowSequenceEditor] = useState(false);
  const [renamingActive, setRenamingActive] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const [presetSaveName, setPresetSaveName] = useState("");
  const [pausedMode, setPausedMode] = useState<AutoplayMode | null>(null);

  useEffect(() => {
    if (autoplayMode !== "off") setPausedMode(null);
  }, [autoplayMode]);

  const lastActiveModeRef = useRef<AutoplayMode>("off");
  useEffect(() => {
    if (autoplayMode !== "off") lastActiveModeRef.current = autoplayMode;
  }, [autoplayMode]);

  const prevDisplayModeRef = useRef(displayMode);
  useEffect(() => {
    if (prevDisplayModeRef.current !== displayMode) {
      prevDisplayModeRef.current = displayMode;
      setUserFlipOverride(false);
    }
  }, [displayMode]);

  const activePreset = activePresetId
    ? sequencePresets.find((p) => p.id === activePresetId) || null
    : null;
  const isDirty = !!activePreset
    && sequenceSignature(activePreset.steps) !== sequenceSignature(customSequence);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite();
    if (!word.favorite) { setJustFavorited(true); setTimeout(() => setJustFavorited(false), 400); }
  };

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    if (pct < 0.1) onPrevious();
    else if (pct > 0.9) onNext();
    else {
      if (isAutoplayActive || isRepeatActive) {
        setUserFlipOverride((p) => !p);
      } else {
        onFlip();
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    setHoveredZone(pct < 0.1 ? "left" : pct > 0.9 ? "right" : null);
  };

  const getContentToShow = () => {
    if (isAutoplayActive || isRepeatActive) {
      let base = displayMode === "chinese"
        ? { showChinese: true, showEnglish: false }
        : displayMode === "english"
          ? { showChinese: false, showEnglish: true }
          : { showChinese: !isFlipped, showEnglish: isFlipped };
      if (userFlipOverride) base = { showChinese: !base.showChinese, showEnglish: !base.showEnglish };
      return base;
    }
    if (showChineseFirst) return { showChinese: !isFlipped, showEnglish: isFlipped };
    return { showChinese: isFlipped, showEnglish: !isFlipped };
  };

  const { showChinese } = getContentToShow();

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    onSeek(Math.round(((e.clientX - rect.left) / rect.width) * (totalWords - 1)));
  };

  const handleProgressDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    onSeek(Math.round((x / rect.width) * (totalWords - 1)));
  };

  const autoplayOptions = [
    { mode: "chinese" as AutoplayMode, label: originalLabel === "Chinese" ? "中" : "Orig", tooltip: `Autoplay ${originalLabel} only` },
    { mode: "english" as AutoplayMode, label: translationLabel === "English" ? "EN" : "Trans", tooltip: `Autoplay ${translationLabel} only` },
    { mode: "chinese-to-english" as AutoplayMode, label: "→", tooltip: `${originalLabel} → ${translationLabel}` },
    { mode: "english-to-chinese" as AutoplayMode, label: "←", tooltip: `${translationLabel} → ${originalLabel}` },
    { mode: "custom" as AutoplayMode, label: "Custom", tooltip: "Custom playback sequence" },
  ];

  // Pause/Play toggle for autoplay
  const handlePauseResume = () => {
    if (isAutoplayActive) {
      setPausedMode(autoplayMode);
      onAutoplayModeChange("off");
    } else if (pausedMode) {
      onAutoplayModeChange(pausedMode);
    } else if (lastActiveModeRef.current !== "off") {
      onAutoplayModeChange(lastActiveModeRef.current);
    }
  };

  // ── Custom sequence helpers ──
  const trackLabel: Record<CustomSequenceTrack, string> = {
    original: "Orig", translation: "Trans", example: "Example",
  };
  const trackColor: Record<CustomSequenceTrack, string> = {
    original: "bg-emerald-500/80 border-emerald-300",
    translation: "bg-sky-500/80 border-sky-300",
    example: "bg-amber-500/80 border-amber-300",
  };
  const updateStep = (i: number, patch: Partial<CustomSequenceStep>) => {
    onCustomSequenceChange(customSequence.map((s, idx) => idx === i ? { ...s, ...patch } : s));
  };
  const moveStep = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= customSequence.length) return;
    const next = [...customSequence];
    [next[i], next[j]] = [next[j], next[i]];
    onCustomSequenceChange(next);
  };
  const removeStep = (i: number) => {
    onCustomSequenceChange(customSequence.filter((_, idx) => idx !== i));
  };
  const addStep = (track: CustomSequenceTrack) => {
    onCustomSequenceChange([...customSequence, { track, repeat: 1 }]);
  };

  const exampleSentence = word.exampleSentence;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="w-full h-full flex flex-col">
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
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />

          {/* Top Left: Dark Mode + Word List */}
          <div className="absolute top-3 left-3 sm:top-4 sm:left-4 flex items-center gap-1.5 z-30">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleDarkMode(); }}
                  className="p-2 sm:p-2.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                >
                  {isDarkMode ? <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-white" /> : <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-white" />}
                </button>
              </TooltipTrigger>
              <TooltipContent><p>{isDarkMode ? "Switch to light mode" : "Switch to dark mode"}</p></TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => { e.stopPropagation(); onOpenWordList(); }}
                  className="p-2 sm:p-2.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                >
                  <List className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </button>
              </TooltipTrigger>
              <TooltipContent><p>Word list (include/exclude)</p></TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => { e.stopPropagation(); onGenerateExamples(); }}
                  disabled={isGeneratingExamples}
                  className={cn(
                    "p-2 sm:p-2.5 rounded-full transition-colors",
                    isGeneratingExamples ? "bg-white/10 text-white/60" : "bg-white/20 hover:bg-white/30 text-white"
                  )}
                >
                  {isGeneratingExamples
                    ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                    : <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />}
                </button>
              </TooltipTrigger>
              <TooltipContent><p>{isGeneratingExamples ? "Generating examples…" : "Generate example sentences (AI)"}</p></TooltipContent>
            </Tooltip>
          </div>

          {/* Top Center: Stats */}
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

          {/* Top Right: Scoring + Favorite */}
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex items-center gap-1.5 sm:gap-2 z-30">
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={(e) => { e.stopPropagation(); onIncorrect(); }}
                  className={cn("p-1.5 sm:p-2 rounded-full transition-colors",
                    (word.incorrectCount || 0) > 0 ? "bg-rose-500/80 ring-2 ring-white/40" : "bg-rose-500/30 hover:bg-rose-500/50")}>
                  <ThumbsDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                </button>
              </TooltipTrigger>
              <TooltipContent><p>{(word.incorrectCount || 0) > 0 ? "Remove incorrect" : "Mark as incorrect"}</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={(e) => { e.stopPropagation(); onCorrect(); }}
                  className={cn("p-1.5 sm:p-2 rounded-full transition-colors",
                    (word.correctCount || 0) > 0 ? "bg-emerald-500/80 ring-2 ring-white/40" : "bg-emerald-500/30 hover:bg-emerald-500/50")}>
                  <ThumbsUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                </button>
              </TooltipTrigger>
              <TooltipContent><p>{(word.correctCount || 0) > 0 ? "Remove correct" : "Mark as correct"}</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={handleFavoriteClick}
                  className={cn("p-1.5 sm:p-2 rounded-full transition-all",
                    word.favorite ? "bg-rose-500/30 text-rose-300" : "bg-white/20 text-white/60 hover:text-white")}>
                  <Heart className={cn("w-4 h-4 sm:w-5 sm:h-5 transition-transform", word.favorite && "fill-current", justFavorited && "animate-pulse")} />
                </button>
              </TooltipTrigger>
              <TooltipContent><p>{word.favorite ? "Remove from favorites" : "Add to favorites"}</p></TooltipContent>
            </Tooltip>
          </div>

          {/* Navigation Zones */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: hoveredZone === "left" ? 1 : 0.4 }}
            className="absolute left-0 top-0 bottom-0 w-[10%] flex items-center justify-center z-20 pointer-events-none">
            <div className="bg-black/20 rounded-full p-2 sm:p-3"><ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8 text-white" /></div>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: hoveredZone === "right" ? 1 : 0.4 }}
            className="absolute right-0 top-0 bottom-0 w-[10%] flex items-center justify-center z-20 pointer-events-none">
            <div className="bg-black/20 rounded-full p-2 sm:p-3"><ChevronRight className="w-6 h-6 sm:w-8 sm:h-8 text-white" /></div>
          </motion.div>

          {/* Speaking indicator */}
          {currentlySpoken && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="absolute top-14 sm:top-16 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/20 rounded-full px-2 sm:px-3 py-1 z-20">
              <Volume2 className="w-3 h-3 sm:w-4 sm:h-4 text-white animate-pulse" />
              <span className="text-[10px] sm:text-xs text-white font-medium">
                {currentlySpoken === "chinese" ? `Speaking ${originalLabel}` : `Speaking ${translationLabel}`}
              </span>
            </motion.div>
          )}

          {/* Card Content */}
          <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-8" style={{ perspective: "1000px" }}>
            <motion.div
              key={`${word.id}-${showChinese ? 'ch' : 'en'}`}
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: -90, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              style={{ transformStyle: "preserve-3d" }}
              className="text-center z-10 flex flex-col items-center gap-2 max-w-[92%]"
            >
              {showChinese ? (
                <>
                  {showPinyin && word.pinyin && (
                    <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                      className="text-lg sm:text-xl md:text-2xl text-white/80 font-medium">
                      {word.pinyin}
                    </motion.p>
                  )}
                  <p className="font-chinese text-white font-bold leading-tight"
                    style={{ fontSize: `clamp(32px, ${fontSize}px, ${fontSize}px)` }}>
                    {word.chinese}
                  </p>
                  {word.explanation && (
                    <p className="text-xs sm:text-sm text-white/70 max-w-md text-center mt-1">{word.explanation}</p>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button onClick={(e) => { e.stopPropagation(); onSpeakChinese(); }}
                        className="mt-3 p-2 sm:p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
                        <Volume2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent><p>Speak {originalLabel}</p></TooltipContent>
                  </Tooltip>

                  {exampleSentence && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 }}
                      className="mt-4 max-w-[90%] sm:max-w-[80%] flex items-start gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-3 sm:px-4 py-2 sm:py-3 border border-white/20"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Quote className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/60 shrink-0 mt-1" />
                      <p className="text-sm sm:text-base text-white/90 leading-snug flex-1 text-left">
                        {exampleSentence}
                      </p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={(e) => { e.stopPropagation(); onSpeakExample(); }}
                            className="shrink-0 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                          >
                            <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent><p>Speak example</p></TooltipContent>
                      </Tooltip>
                    </motion.div>
                  )}
                </>
              ) : (
                <>
                  <p className="font-body text-white font-bold leading-tight px-4"
                    style={{ fontSize: `clamp(24px, ${Math.min(fontSize, 80)}px, ${Math.min(fontSize, 80)}px)` }}>
                    {word.english}
                  </p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button onClick={(e) => { e.stopPropagation(); onSpeakEnglish(); }}
                        className="mt-3 p-2 sm:p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
                        <Volume2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent><p>Speak {translationLabel}</p></TooltipContent>
                  </Tooltip>

                  {/* Show extra columns on the back */}
                  {word.extraColumns && Object.keys(word.extraColumns).length > 0 && (
                    <div className="mt-4 max-w-[90%] sm:max-w-[80%] space-y-1.5 text-left" onClick={(e) => e.stopPropagation()}>
                      {Object.entries(word.extraColumns).map(([k, v]) => (
                        <div key={k} className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/20">
                          <span className="text-[10px] uppercase tracking-wider text-white/60">{k}</span>
                          <p className="text-xs sm:text-sm text-white/90">{v}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </div>

          {/* Bottom Section */}
          <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 z-30 bg-gradient-to-t from-black/30 to-transparent">
            {/* Sliders row */}
            <div className="flex justify-end mb-2">
              <div className="flex flex-col gap-1.5 sm:gap-2 items-end">
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <span className="text-[10px] sm:text-xs text-white/70">Font:</span>
                  <div className="w-12 sm:w-16">
                    <Slider value={[fontSize]} min={48} max={150} step={4}
                      onValueChange={([v]) => onFontSizeChange(v)}
                      onClick={(e) => e.stopPropagation()} className="accent-violet-500" />
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium text-white w-8 text-right">{fontSize}px</span>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      <span className="text-[10px] sm:text-xs text-white/70 whitespace-nowrap">Trans:</span>
                      <div className="w-12 sm:w-16">
                        <Slider value={[languageGap]} min={0.5} max={5} step={0.5}
                          onValueChange={([v]) => onLanguageGapChange(v)}
                          onClick={(e) => e.stopPropagation()} className="accent-amber-500" />
                      </div>
                      <span className="text-[10px] sm:text-xs font-medium text-white w-8 text-right">{languageGap}s</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent><p>Delay between languages</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      <span className="text-[10px] sm:text-xs text-white/70 whitespace-nowrap">Next:</span>
                      <div className="w-12 sm:w-16">
                        <Slider value={[nextDelay]} min={1} max={10} step={0.5}
                          onValueChange={([v]) => onNextDelayChange(v)}
                          onClick={(e) => e.stopPropagation()} className="accent-primary" />
                      </div>
                      <span className="text-[10px] sm:text-xs font-medium text-white w-8 text-right">{nextDelay}s</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent><p>Delay before next word</p></TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Autoplay Controls Row */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
              <span className="text-[10px] sm:text-xs text-white/70 font-medium">Autoplay:</span>
              <div className="flex rounded-lg border border-white/30 bg-white/10 overflow-hidden">
                {autoplayOptions.map(({ mode, label, tooltip }) => (
                  <Tooltip key={mode}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (autoplayMode === mode && isAutoplayActive) { onAutoplayModeChange("off"); return; }
                          if (autoplayMode === "chinese" && mode === "english") { onAutoplayModeChange("chinese-to-english"); return; }
                          if (autoplayMode === "english" && mode === "chinese") { onAutoplayModeChange("english-to-chinese"); return; }
                          onAutoplayModeChange(mode);
                          if (mode === "custom") setShowSequenceEditor(true);
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
                    <TooltipContent><p>{tooltip}</p></TooltipContent>
                  </Tooltip>
                ))}
              </div>

              {/* Pause/Play */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => { e.stopPropagation(); handlePauseResume(); }}
                    disabled={!isAutoplayActive && !pausedMode && lastActiveModeRef.current === "off"}
                    className={cn(
                      "p-1 sm:p-1.5 rounded-full transition-colors",
                      isAutoplayActive ? "bg-amber-500 text-white" : "bg-white/20 text-white hover:bg-white/30",
                      !isAutoplayActive && !pausedMode && lastActiveModeRef.current === "off" && "opacity-40 cursor-not-allowed"
                    )}
                  >
                    {isAutoplayActive ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent><p>{isAutoplayActive ? "Pause autoplay" : "Resume autoplay"}</p></TooltipContent>
              </Tooltip>

              {/* Repeat */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => { e.stopPropagation(); if (isAutoplayActive) onToggleAutoplayRepeat(); }}
                    disabled={!isAutoplayActive}
                    className={cn(
                      "p-1 sm:p-1.5 rounded-full transition-colors",
                      !isAutoplayActive ? "bg-white/10 text-white/40 cursor-not-allowed"
                        : isAutoplayRepeating ? "bg-amber-500 text-white" : "bg-white/20 text-white hover:bg-white/30"
                    )}
                  >
                    <Repeat className="w-3 h-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{!isAutoplayActive ? "Select autoplay mode first" : isAutoplayRepeating ? "Stop repeating" : "Repeat current word"}</p>
                </TooltipContent>
              </Tooltip>

              {/* Repeat count */}
              <div className={cn("flex items-center rounded-lg border overflow-hidden",
                !isAutoplayActive ? "border-white/20 bg-white/5" : "border-white/30 bg-white/10")}>
                <button
                  onClick={(e) => { e.stopPropagation(); if (!isAutoplayActive) return; if (autoplayRepeatCount > 0) onAutoplayRepeatCountChange(autoplayRepeatCount - 1); }}
                  disabled={!isAutoplayActive}
                  className={cn("px-1 sm:px-1.5 py-0.5 sm:py-1 transition-colors",
                    !isAutoplayActive ? "text-white/40 cursor-not-allowed" : "text-white hover:bg-white/20")}>
                  <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                </button>
                <span className={cn("px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold min-w-[20px] sm:min-w-[28px] text-center border-x",
                  !isAutoplayActive ? "text-white/40 border-white/20" : "text-white border-white/30")}>
                  {autoplayRepeatCount === 0 ? "∞" : autoplayRepeatCount}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); if (!isAutoplayActive) return; onAutoplayRepeatCountChange(autoplayRepeatCount + 1); }}
                  disabled={!isAutoplayActive}
                  className={cn("px-1 sm:px-1.5 py-0.5 sm:py-1 transition-colors",
                    !isAutoplayActive ? "text-white/40 cursor-not-allowed" : "text-white hover:bg-white/20")}>
                  <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                </button>
              </div>

              {/* Include example toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => { e.stopPropagation(); onIncludeExampleChange(!includeExample); }}
                    className={cn(
                      "p-1 sm:p-1.5 rounded-full transition-colors",
                      includeExample ? "bg-amber-500 text-white" : "bg-white/20 text-white hover:bg-white/30"
                    )}
                  >
                    {includeExample ? <MessageSquareText className="w-3 h-3" /> : <MessageSquareOff className="w-3 h-3" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent><p>{includeExample ? "Don't speak example" : "Also speak example sentence"}</p></TooltipContent>
              </Tooltip>

              {/* Sequence editor toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowSequenceEditor((p) => !p); }}
                    className={cn(
                      "p-1 sm:p-1.5 rounded-full transition-colors",
                      showSequenceEditor ? "bg-violet-500 text-white" : "bg-white/20 text-white hover:bg-white/30"
                    )}
                  >
                    <Settings2 className="w-3 h-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent><p>Custom sequence editor</p></TooltipContent>
              </Tooltip>

              {/* Preset menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="px-2 py-1 rounded-md text-[10px] sm:text-xs bg-white/20 text-white hover:bg-white/30 flex items-center gap-1"
                  >
                    <span className="truncate max-w-[80px]">
                      {activePreset ? activePreset.name : "Presets"}
                    </span>
                    {isDirty && <span className="text-amber-300">•</span>}
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="text-xs">Saved sequences</DropdownMenuLabel>
                  {sequencePresets.length === 0 && (
                    <DropdownMenuItem disabled className="text-xs text-muted-foreground">No presets yet</DropdownMenuItem>
                  )}
                  {sequencePresets.map((p) => (
                    <DropdownMenuItem
                      key={p.id}
                      onClick={() => onSelectPreset(p.id)}
                      className={cn("text-xs", p.id === activePresetId && "bg-accent")}
                    >
                      {p.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5 flex gap-1.5">
                    <input
                      value={presetSaveName}
                      onChange={(e) => setPresetSaveName(e.target.value)}
                      placeholder="Name…"
                      className="flex-1 text-xs px-2 py-1 rounded border border-input bg-background outline-none focus:ring-1 ring-primary"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (presetSaveName.trim()) {
                          onSaveAsPreset(presetSaveName.trim());
                          setPresetSaveName("");
                        }
                      }}
                      className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:opacity-90"
                    >
                      <Save className="w-3 h-3" />
                    </button>
                  </div>
                  {activePreset && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-xs" onClick={onUpdateActivePreset} disabled={!isDirty}>
                        Update "{activePreset.name}"
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-xs"
                        onClick={() => {
                          setRenamingActive(true);
                          setRenameDraft(activePreset.name);
                        }}
                      >
                        Rename…
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-xs text-destructive"
                        onClick={onDeleteActivePreset}
                      >
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Rename input */}
            {renamingActive && activePreset && (
              <div className="mt-2 flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                <input
                  value={renameDraft}
                  onChange={(e) => setRenameDraft(e.target.value)}
                  className="flex-1 text-xs px-2 py-1 rounded border border-white/30 bg-white/10 text-white placeholder-white/50 outline-none focus:ring-1 ring-white"
                  placeholder="New name…"
                />
                <button
                  onClick={() => {
                    if (renameDraft.trim()) onRenameActivePreset(renameDraft.trim());
                    setRenamingActive(false);
                  }}
                  className="px-2 py-1 text-xs bg-emerald-500 text-white rounded"
                >
                  Save
                </button>
                <button onClick={() => setRenamingActive(false)} className="px-2 py-1 text-xs bg-white/20 text-white rounded">
                  Cancel
                </button>
              </div>
            )}

            {/* Custom sequence editor */}
            {showSequenceEditor && (
              <div className="mt-2 p-2 sm:p-3 rounded-lg bg-black/30 border border-white/20" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-white/90">Custom sequence</span>
                  <span className="text-[10px] text-white/60">Plays in order, each step N times</span>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-2">
                  {customSequence.map((step, i) => (
                    <div key={i} className={cn("flex items-center gap-1 rounded-lg border px-1.5 py-1 text-[11px] text-white", trackColor[step.track])}>
                      <span className="font-bold">{trackLabel[step.track]}</span>
                      <span>×</span>
                      <button onClick={() => updateStep(i, { repeat: Math.max(1, step.repeat - 1) })} className="px-1 hover:bg-white/20 rounded">
                        <Minus className="w-2.5 h-2.5" />
                      </button>
                      <span className="min-w-[14px] text-center">{step.repeat}</span>
                      <button onClick={() => updateStep(i, { repeat: step.repeat + 1 })} className="px-1 hover:bg-white/20 rounded">
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                      <button onClick={() => moveStep(i, -1)} className="px-1 hover:bg-white/20 rounded" disabled={i === 0}>
                        <ArrowUp className="w-2.5 h-2.5" />
                      </button>
                      <button onClick={() => moveStep(i, 1)} className="px-1 hover:bg-white/20 rounded" disabled={i === customSequence.length - 1}>
                        <ArrowDown className="w-2.5 h-2.5" />
                      </button>
                      <button onClick={() => removeStep(i)} className="px-1 hover:bg-white/20 rounded text-red-200">
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                  {customSequence.length === 0 && (
                    <span className="text-[11px] text-white/60 italic">Empty — add steps below.</span>
                  )}
                </div>

                <div className="flex gap-1.5 text-[11px]">
                  <button onClick={() => addStep("original")} className="px-2 py-1 rounded bg-emerald-500/30 text-white hover:bg-emerald-500/50">+ {originalLabel}</button>
                  <button onClick={() => addStep("translation")} className="px-2 py-1 rounded bg-sky-500/30 text-white hover:bg-sky-500/50">+ {translationLabel}</button>
                  <button onClick={() => addStep("example")} className="px-2 py-1 rounded bg-amber-500/30 text-white hover:bg-amber-500/50">+ Example</button>
                </div>
              </div>
            )}
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
            onMouseDown={(e) => { e.stopPropagation(); setIsDragging(true); }}
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