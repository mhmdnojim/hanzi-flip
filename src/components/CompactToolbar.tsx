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
  ChevronDown,
  Languages,
  Type as TypeIcon,
  Trash2,
  Palette,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { VoiceType, VocabularyDeck } from "@/types/vocabulary";
import { getLanguage } from "@/utils/languages";
import { getTheme, nextThemeId, FontSizePreset, nextFontSize } from "@/utils/themes";
import { cn } from "@/lib/utils";

interface CompactToolbarProps {
  deckName: string;
  decks: VocabularyDeck[];
  currentDeckId: string;
  onDeckChange: (deckId: string) => void;
  onDeleteDeck: (deckId: string) => void;
  onImport: (files: File[]) => void;
  /** Multi-language selection */
  availableLanguages: string[];
  studyLang: string;
  translationLang: string;
  onStudyLangChange: (code: string) => void;
  onTranslationLangChange: (code: string) => void;
  /** Theme + text size */
  themeId: string;
  onThemeChange: (id: string) => void;
  fontSizePreset: FontSizePreset;
  onFontSizePresetChange: (size: FontSizePreset) => void;
  showPinyin: boolean;
  onTogglePinyin: () => void;
  showChineseFirst: boolean;
  onToggleChineseFirst: () => void;
  onResetFlip: () => void;
  voiceType: VoiceType;
  onVoiceTypeChange: (type: VoiceType) => void;
  voiceMuted: boolean;
  onToggleVoiceMuted: () => void;
  sfxMuted: boolean;
  onToggleSfxMuted: () => void;
  isShuffled: boolean;
  onShuffle: () => void;
  onResetOrder: () => void;
  onResetProgress: () => void;
}

export function CompactToolbar(props: CompactToolbarProps) {
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) {
      props.onImport(files);
    }
    e.target.value = "";
  };

  const studyLanguage = getLanguage(props.studyLang);
  const translationLanguage = getLanguage(props.translationLang);
  const activeTheme = getTheme(props.themeId);
  const canDelete = props.decks.length > 1 || props.currentDeckId !== "sample";

  return (
    <TooltipProvider delayDuration={300}>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2"
      >
        {/* Level / file selector (HSK1, HSK2, …) */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="h-8 sm:h-9 px-2 sm:px-3 gap-1 text-xs sm:text-sm rounded-full max-w-[10rem]"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{props.deckName}</span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Select level / vocabulary file</p>
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent>
            {props.decks.map((deck) => (
              <DropdownMenuItem
                key={deck.id}
                onClick={() => props.onDeckChange(deck.id)}
                className={cn("gap-2", deck.id === props.currentDeckId && "bg-accent")}
              >
                <span className="truncate">{deck.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Upload */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-full border-orange-400 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950"
              asChild
            >
              <label className="cursor-pointer">
                <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <input type="file" accept=".xlsx,.xls" multiple className="hidden" onChange={handleFileUpload} />
              </label>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Upload Excel file(s) — you can select several at once</p>
          </TooltipContent>
        </Tooltip>

        {/* Delete current file */}
        {canDelete && (
          <AlertDialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 sm:h-9 sm:w-9 rounded-full border-destructive text-destructive hover:bg-destructive/10"
                    aria-label={`Delete ${props.deckName}`}
                  >
                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </Button>
                </AlertDialogTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Delete "{props.deckName}"</p>
              </TooltipContent>
            </Tooltip>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete "{props.deckName}"?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes the file and all of its words. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel autoFocus>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => props.onDeleteDeck(props.currentDeckId)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete permanently
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* Study language */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm" className="h-8 sm:h-9 px-2 sm:px-3 gap-1 text-xs sm:text-sm rounded-full">
                  <Languages className="w-3.5 h-3.5" />
                  {studyLanguage.short}
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Language you practise: {studyLanguage.name}</p>
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent>
            {props.availableLanguages.map((code) => (
              <DropdownMenuItem
                key={code}
                onClick={() => props.onStudyLangChange(code)}
                className={cn("gap-2", code === props.studyLang && "bg-accent")}
              >
                <span>{getLanguage(code).name}</span>
                {getLanguage(code).romanizationLabel && (
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {getLanguage(code).romanizationLabel}
                  </span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Translation language */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 sm:h-9 px-2 sm:px-3 gap-1 text-xs sm:text-sm rounded-full">
                  → {translationLanguage.short}
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Translation shown: {translationLanguage.name}</p>
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent>
            {props.availableLanguages
              .filter((code) => code !== props.studyLang)
              .map((code) => (
                <DropdownMenuItem
                  key={code}
                  onClick={() => props.onTranslationLangChange(code)}
                  className={cn(code === props.translationLang && "bg-accent")}
                >
                  {getLanguage(code).name}
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Shuffle / Sequential */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={props.isShuffled ? "secondary" : "outline"}
              size="icon"
              className={cn(
                "h-8 w-8 sm:h-9 sm:w-9 rounded-full",
                props.isShuffled && "bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300"
              )}
              onClick={props.isShuffled ? props.onResetOrder : props.onShuffle}
            >
              {props.isShuffled ? (
                <ListOrdered className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              ) : (
                <Shuffle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{props.isShuffled ? "Reset to sequential order" : "Shuffle cards"}</p>
          </TooltipContent>
        </Tooltip>

        {/* Language First - Fixed width to prevent layout shift */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                props.onToggleChineseFirst();
                props.onResetFlip();
              }}
              className="h-8 sm:h-9 w-16 sm:w-20 rounded-full bg-primary hover:bg-primary/90 text-xs sm:text-sm"
            >
              <Languages className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
              {props.showChineseFirst ? studyLanguage.short : translationLanguage.short}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {props.showChineseFirst
                ? `Show ${translationLanguage.name} on front`
                : `Show ${studyLanguage.name} on front`}
            </p>
          </TooltipContent>
        </Tooltip>

        {/* Transcription toggle (Pinyin / Latin transliteration) */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={props.showPinyin ? "secondary" : "outline"}
              size="icon"
              className={cn(
                "h-8 w-8 sm:h-9 sm:w-9 rounded-full",
                props.showPinyin && "bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300"
              )}
              onClick={props.onTogglePinyin}
            >
              <TypeIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {props.showPinyin ? "Hide" : "Show"} {studyLanguage.romanizationLabel || "transcription"}
            </p>
          </TooltipContent>
        </Tooltip>

        {/* Text size — cycles S → M → L → XL */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 sm:h-9 px-2 gap-1 rounded-full text-xs"
              onClick={() => props.onFontSizePresetChange(nextFontSize(props.fontSizePreset))}
              aria-label={`Text size ${props.fontSizePreset}, click to change`}
            >
              <TypeIcon className="w-3.5 h-3.5" />
              <span className="uppercase tracking-wide">
                {props.fontSizePreset === "x-large" ? "XL" : props.fontSizePreset.charAt(0)}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Text size: {props.fontSizePreset} — click for {nextFontSize(props.fontSizePreset)}</p>
          </TooltipContent>
        </Tooltip>

        {/* Theme — each tap switches to the next theme */}
        <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 sm:h-9 px-2 gap-1.5 rounded-full"
                onClick={() => props.onThemeChange(nextThemeId(props.themeId))}
                onContextMenu={(e) => e.preventDefault()}
                aria-label={`Theme ${activeTheme.name}, click to change`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span className="flex h-4 w-4 overflow-hidden rounded-full border border-border">
                  {activeTheme.swatch.map((color, i) => (
                    <span key={i} className="h-full flex-1" style={{ backgroundColor: `hsl(${color})` }} />
                  ))}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Theme: {activeTheme.name} — click for {getTheme(nextThemeId(props.themeId)).name}</p>
            </TooltipContent>
        </Tooltip>

        {/* Voice Type */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={props.voiceType === "free" ? "secondary" : "default"}
              size="sm"
              onClick={() => props.onVoiceTypeChange(props.voiceType === "free" ? "premium" : "free")}
              className={cn(
                "h-8 sm:h-9 px-2 sm:px-3 rounded-full text-xs sm:text-sm",
                props.voiceType === "free" && "bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300"
              )}
            >
              🎙 {props.voiceType === "free" ? "Free" : "Pro"}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{props.voiceType === "free" ? "Using free voice" : "Using premium voice"} - Click to toggle</p>
          </TooltipContent>
        </Tooltip>

        {/* Voice Mute */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8 sm:h-9 sm:w-9 rounded-full", props.voiceMuted && "text-muted-foreground")}
              onClick={props.onToggleVoiceMuted}
            >
              {props.voiceMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-blue-500" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{props.voiceMuted ? "Unmute voice" : "Mute voice"}</p>
          </TooltipContent>
        </Tooltip>

        {/* SFX Mute */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8 sm:h-9 sm:w-9 rounded-full", props.sfxMuted && "text-muted-foreground")}
              onClick={props.onToggleSfxMuted}
            >
              {props.sfxMuted ? <Music2 className="w-4 h-4" /> : <Music className="w-4 h-4 text-violet-500" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{props.sfxMuted ? "Unmute sound effects" : "Mute sound effects"}</p>
          </TooltipContent>
        </Tooltip>

        {/* Reset Progress */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-full text-muted-foreground hover:text-destructive"
              onClick={props.onResetProgress}
            >
              <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Reset all progress</p>
          </TooltipContent>
        </Tooltip>
      </motion.div>
    </TooltipProvider>
  );
}
