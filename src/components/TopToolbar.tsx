import { useState } from "react";
import { motion } from "framer-motion";
import {
  Shuffle,
  ListOrdered,
  RotateCcw,
  Upload,
  Volume2,
  VolumeX,
  Music,
  Music2,
  Sun,
  Moon,
  Play,
  Star,
  Timer,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AutoplayMode, VoiceType, VocabularyDeck } from "@/types/vocabulary";
import { cn } from "@/lib/utils";

interface TopToolbarProps {
  // Deck info
  deckName: string;
  decks: VocabularyDeck[];
  currentDeckId: string;
  onDeckChange: (deckId: string) => void;
  onImport: (file: File) => void;

  // Stats
  favoritesCount: number;
  elapsedTime: string;
  completionPercentage: number;

  // Display settings
  showPinyin: boolean;
  onTogglePinyin: () => void;
  showChineseFirst: boolean;
  onToggleChineseFirst: () => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;

  // Audio settings
  voiceType: VoiceType;
  onVoiceTypeChange: (type: VoiceType) => void;
  voiceMuted: boolean;
  onToggleVoiceMuted: () => void;
  sfxMuted: boolean;
  onToggleSfxMuted: () => void;

  // Navigation
  isShuffled: boolean;
  onShuffle: () => void;
  onResetOrder: () => void;
  onResetProgress: () => void;

  // Autoplay settings
  autoplayMode: AutoplayMode;
  onAutoplayModeChange: (mode: AutoplayMode) => void;
  isAutoplayActive: boolean;
  onToggleAutoplay: () => void;
  nextDelay: number;
  onNextDelayChange: (delay: number) => void;
  languageGap: number;
  onLanguageGapChange: (gap: number) => void;
}

export function TopToolbar(props: TopToolbarProps) {
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      props.onImport(file);
    }
  };

  const currentDeck = props.decks.find((d) => d.id === props.currentDeckId);
  const deckFileName = currentDeck?.name?.includes(".") 
    ? currentDeck.name 
    : `${currentDeck?.name || "Sample"}.xlsx`;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full space-y-3 bg-card/80 backdrop-blur-sm rounded-2xl border border-border p-4 shadow-lg"
    >
      {/* Row 1: Deck, Upload, Theme, Stats, Reset */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Deck Name */}
        <span className="font-bold text-lg text-primary">{props.deckName}</span>

        {/* Deck Selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="sm" className="gap-1 text-xs">
              📄 {deckFileName}
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {props.decks.map((deck) => (
              <DropdownMenuItem
                key={deck.id}
                onClick={() => props.onDeckChange(deck.id)}
                className={cn(deck.id === props.currentDeckId && "bg-accent")}
              >
                {deck.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Upload */}
        <Button variant="outline" size="sm" className="gap-1 border-orange-400 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950" asChild>
          <label className="cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Upload</span>
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileUpload} />
          </label>
        </Button>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={props.onToggleDarkMode}
        >
          {props.isDarkMode ? (
            <Moon className="w-4 h-4 text-indigo-400" />
          ) : (
            <Sun className="w-4 h-4 text-amber-500" />
          )}
        </Button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Stats */}
        <div className="flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1 text-amber-500">
            <Star className="w-4 h-4 fill-current" />
            {props.favoritesCount}
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Timer className="w-4 h-4" />
            {props.elapsedTime}
          </span>
          <span className={cn(
            "font-medium",
            props.completionPercentage < 30 && "text-orange-500",
            props.completionPercentage >= 30 && props.completionPercentage < 70 && "text-blue-500",
            props.completionPercentage >= 70 && "text-emerald-500"
          )}>
            ◉ {props.completionPercentage}%
          </span>
        </div>

        {/* Reset */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={props.onResetProgress}
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      {/* Row 2: Shuffle, Sequential, Language, Pinyin, Voice, Audio Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={props.isShuffled ? "outline" : "secondary"}
          size="sm"
          onClick={props.onShuffle}
          className={cn(!props.isShuffled && "bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300")}
        >
          <Shuffle className="w-3.5 h-3.5 mr-1" />
          Shuffle
        </Button>
        
        <Button
          variant={props.isShuffled ? "secondary" : "outline"}
          size="sm"
          onClick={props.onResetOrder}
          className={cn(props.isShuffled && "bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300")}
        >
          <ListOrdered className="w-3.5 h-3.5 mr-1" />
          Sequential
        </Button>

        <Button
          variant="default"
          size="sm"
          onClick={props.onToggleChineseFirst}
          className="bg-primary hover:bg-primary/90"
        >
          中 {props.showChineseFirst ? "Chinese in front" : "English in front"}
        </Button>

        <Button
          variant={props.showPinyin ? "secondary" : "outline"}
          size="sm"
          onClick={props.onTogglePinyin}
          className={cn(props.showPinyin && "bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300")}
        >
          🔤 Pinyin
        </Button>

        <Button
          variant={props.voiceType === "free" ? "secondary" : "default"}
          size="sm"
          onClick={() => props.onVoiceTypeChange(props.voiceType === "free" ? "premium" : "free")}
          className={cn(props.voiceType === "free" && "bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300")}
        >
          🎙 {props.voiceType === "free" ? "Free" : "Premium"}
        </Button>

        {/* Audio Controls */}
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", props.voiceMuted && "text-muted-foreground")}
          onClick={props.onToggleVoiceMuted}
        >
          {props.voiceMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-blue-500" />}
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", props.sfxMuted && "text-muted-foreground")}
          onClick={props.onToggleSfxMuted}
        >
          {props.sfxMuted ? <Music2 className="w-4 h-4" /> : <Music className="w-4 h-4 text-violet-500" />}
        </Button>
      </div>

      {/* Row 3: Autoplay & Repeat Mode Selectors */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        {/* Autoplay Mode Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Autoplay:</span>
          <div className="flex rounded-lg border border-border overflow-hidden">
            {[
              { mode: "chinese" as AutoplayMode, label: "中" },
              { mode: "english" as AutoplayMode, label: "EN" },
              { mode: "chinese-to-english" as AutoplayMode, label: "中→EN" },
              { mode: "english-to-chinese" as AutoplayMode, label: "EN→中" },
            ].map(({ mode, label }) => (
              <button
                key={mode}
                onClick={() => props.onAutoplayModeChange(mode === props.autoplayMode ? "off" : mode)}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium transition-colors",
                  props.autoplayMode === mode
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Timing Controls */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Next translation:</span>
          <div className="w-16">
            <Slider
              value={[props.languageGap]}
              min={0.5}
              max={5}
              step={0.5}
              onValueChange={([v]) => props.onLanguageGapChange(v)}
              className="accent-blue-500"
            />
          </div>
          <span className="text-xs font-medium text-blue-500">{props.languageGap}s</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Next word:</span>
          <div className="w-20">
            <Slider
              value={[props.nextDelay]}
              min={1}
              max={10}
              step={0.5}
              onValueChange={([v]) => props.onNextDelayChange(v)}
              className="accent-primary"
            />
          </div>
          <span className="text-xs font-medium text-primary">{props.nextDelay}s</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Font:</span>
          <div className="w-20">
            <Slider
              value={[props.fontSize]}
              min={48}
              max={150}
              step={4}
              onValueChange={([v]) => props.onFontSizeChange(v)}
              className="accent-violet-500"
            />
          </div>
          <span className="text-xs font-medium text-violet-500">{props.fontSize}px</span>
        </div>
      </div>
    </motion.div>
  );
}
