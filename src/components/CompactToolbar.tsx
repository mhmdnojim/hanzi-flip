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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { VoiceType, VocabularyDeck } from "@/types/vocabulary";
import { cn } from "@/lib/utils";

interface CompactToolbarProps {
  deckName: string;
  decks: VocabularyDeck[];
  currentDeckId: string;
  onDeckChange: (deckId: string) => void;
  onImport: (file: File) => void;
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
    const file = e.target.files?.[0];
    if (file) {
      props.onImport(file);
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2"
      >
        {/* Deck Selector */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="h-8 sm:h-9 px-2 sm:px-3 gap-1 text-xs sm:text-sm rounded-full"
                >
                  📄 <span className="hidden sm:inline">{props.deckName}</span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Select vocabulary deck</p>
            </TooltipContent>
          </Tooltip>
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
                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileUpload} />
              </label>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Upload Excel file</p>
          </TooltipContent>
        </Tooltip>

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
              {props.showChineseFirst ? "中" : "EN"}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{props.showChineseFirst ? "Show English on front" : "Show Chinese on front"}</p>
          </TooltipContent>
        </Tooltip>

        {/* Pinyin Toggle */}
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
            <p>{props.showPinyin ? "Hide Pinyin" : "Show Pinyin"}</p>
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
