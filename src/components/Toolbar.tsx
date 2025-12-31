import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Shuffle,
  ListOrdered,
  RotateCcw,
  Download,
  Upload,
  Volume2,
  VolumeX,
  Music,
  Music2,
  Eye,
  EyeOff,
  Type,
  Sun,
  Moon,
  Play,
  Pause,
  Database,
  HardDrive,
  Cloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AutoplayMode, VoiceType, StorageMode, VocabularyDeck } from "@/types/vocabulary";
import { cn } from "@/lib/utils";

interface ToolbarProps {
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
  voiceSpeed: number;
  onVoiceSpeedChange: (speed: number) => void;
  voiceMuted: boolean;
  onToggleVoiceMuted: () => void;
  sfxMuted: boolean;
  onToggleSfxMuted: () => void;

  // Autoplay settings
  autoplayMode: AutoplayMode;
  onAutoplayModeChange: (mode: AutoplayMode) => void;
  nextDelay: number;
  onNextDelayChange: (delay: number) => void;
  languageGap: number;
  onLanguageGapChange: (gap: number) => void;

  // Navigation
  isShuffled: boolean;
  onShuffle: () => void;
  onResetOrder: () => void;
  onResetProgress: () => void;

  // Data management
  decks: VocabularyDeck[];
  currentDeckId: string;
  onDeckChange: (deckId: string) => void;
  onImport: (file: File) => void;
  onExportFavorites: () => void;
  onExportProgress: () => void;
  storageMode: StorageMode;
  onStorageModeChange: (mode: StorageMode) => void;
}

export function Toolbar(props: ToolbarProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    display: true,
    audio: false,
    autoplay: false,
    data: false,
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      props.onImport(file);
    }
  };

  return (
    <div className="w-full space-y-3">
      {/* Display Section */}
      <ToolbarSection
        title="Display"
        icon={<Eye className="w-4 h-4" />}
        isOpen={openSections.display}
        onToggle={() => toggleSection("display")}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              {props.showPinyin ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              Show Pinyin
            </Label>
            <Switch checked={props.showPinyin} onCheckedChange={props.onTogglePinyin} />
          </div>

          <div className="flex items-center justify-between">
            <Label>Show First</Label>
            <Select
              value={props.showChineseFirst ? "chinese" : "english"}
              onValueChange={(v) => props.onToggleChineseFirst()}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="chinese">Chinese</SelectItem>
                <SelectItem value="english">English</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Type className="w-4 h-4" />
              Font Size: {props.fontSize}px
            </Label>
            <Slider
              value={[props.fontSize]}
              min={48}
              max={150}
              step={4}
              onValueChange={([v]) => props.onFontSizeChange(v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              {props.isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              Dark Mode
            </Label>
            <Switch checked={props.isDarkMode} onCheckedChange={props.onToggleDarkMode} />
          </div>
        </div>
      </ToolbarSection>

      {/* Audio Section */}
      <ToolbarSection
        title="Audio"
        icon={<Volume2 className="w-4 h-4" />}
        isOpen={openSections.audio}
        onToggle={() => toggleSection("audio")}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Voice Type</Label>
            <Select
              value={props.voiceType}
              onValueChange={(v) => props.onVoiceTypeChange(v as VoiceType)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free (Web)</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Speed: {props.voiceSpeed.toFixed(1)}x</Label>
            <Slider
              value={[props.voiceSpeed]}
              min={0.5}
              max={2}
              step={0.1}
              onValueChange={([v]) => props.onVoiceSpeedChange(v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              {props.voiceMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              Mute Voice
            </Label>
            <Switch checked={props.voiceMuted} onCheckedChange={props.onToggleVoiceMuted} />
          </div>

          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              {props.sfxMuted ? <Music2 className="w-4 h-4" /> : <Music className="w-4 h-4" />}
              Mute Sound Effects
            </Label>
            <Switch checked={props.sfxMuted} onCheckedChange={props.onToggleSfxMuted} />
          </div>
        </div>
      </ToolbarSection>

      {/* Autoplay Section */}
      <ToolbarSection
        title="Autoplay"
        icon={<Play className="w-4 h-4" />}
        isOpen={openSections.autoplay}
        onToggle={() => toggleSection("autoplay")}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Mode</Label>
            <Select
              value={props.autoplayMode}
              onValueChange={(v) => props.onAutoplayModeChange(v as AutoplayMode)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="off">Off</SelectItem>
                <SelectItem value="chinese">Chinese Only</SelectItem>
                <SelectItem value="english">English Only</SelectItem>
                <SelectItem value="chinese-to-english">Chinese → English</SelectItem>
                <SelectItem value="english-to-chinese">English → Chinese</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Next Word Delay: {props.nextDelay}s</Label>
            <Slider
              value={[props.nextDelay]}
              min={1}
              max={10}
              step={0.5}
              onValueChange={([v]) => props.onNextDelayChange(v)}
            />
          </div>

          {(props.autoplayMode === "chinese-to-english" ||
            props.autoplayMode === "english-to-chinese") && (
            <div className="space-y-2">
              <Label>Language Gap: {props.languageGap}s</Label>
              <Slider
                value={[props.languageGap]}
                min={0.5}
                max={5}
                step={0.5}
                onValueChange={([v]) => props.onLanguageGapChange(v)}
              />
            </div>
          )}
        </div>
      </ToolbarSection>

      {/* Data Section */}
      <ToolbarSection
        title="Data"
        icon={<Database className="w-4 h-4" />}
        isOpen={openSections.data}
        onToggle={() => toggleSection("data")}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Storage Mode</Label>
            <Select
              value={props.storageMode}
              onValueChange={(v) => props.onStorageModeChange(v as StorageMode)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="local">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4" />
                    Local
                  </div>
                </SelectItem>
                <SelectItem value="cloud">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-4 h-4" />
                    Cloud
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Label>Current Deck</Label>
            <Select value={props.currentDeckId} onValueChange={props.onDeckChange}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {props.decks.map((deck) => (
                  <SelectItem key={deck.id} value={deck.id}>
                    {deck.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" className="w-full" asChild>
              <label>
                <Upload className="w-4 h-4 mr-2" />
                Import Excel
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>
            </Button>
            <Button variant="outline" size="sm" onClick={props.onExportFavorites}>
              <Download className="w-4 h-4 mr-2" />
              Export Favs
            </Button>
          </div>

          <Button variant="outline" size="sm" className="w-full" onClick={props.onExportProgress}>
            <Download className="w-4 h-4 mr-2" />
            Export Progress (CSV)
          </Button>
        </div>
      </ToolbarSection>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 pt-2">
        <Button
          variant={props.isShuffled ? "default" : "outline"}
          size="sm"
          onClick={props.isShuffled ? props.onResetOrder : props.onShuffle}
        >
          {props.isShuffled ? (
            <>
              <ListOrdered className="w-4 h-4 mr-2" />
              Sequential
            </>
          ) : (
            <>
              <Shuffle className="w-4 h-4 mr-2" />
              Shuffle
            </>
          )}
        </Button>
        <Button variant="outline" size="sm" onClick={props.onResetProgress}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset Progress
        </Button>
      </div>
    </div>
  );
}

function ToolbarSection({
  title,
  icon,
  isOpen,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between px-4 py-2 h-auto"
        >
          <span className="flex items-center gap-2">
            {icon}
            {title}
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="px-4 py-3 bg-muted/50 rounded-lg mt-1"
        >
          {children}
        </motion.div>
      </CollapsibleContent>
    </Collapsible>
  );
}
