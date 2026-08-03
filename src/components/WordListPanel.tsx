import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckSquare, Square, List, Search, Type, Filter, ChevronDown, ChevronUp, Wand2, Loader2 } from "lucide-react";
import { VocabularyWord } from "@/types/vocabulary";
import { getHSKLevel, getCharacterCount, getFrequencyTier } from "@/lib/hskWordList";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// ── Types ──
type WordCategory = "regular" | "idiom" | "phrasal" | "collocation";
type HSKFilter = 1 | 2 | 3 | 4 | 5 | 6;
type FrequencyFilter = "top500" | "top1000" | "rare";
type CharTypeFilter = "single" | "multi";
type LanguageFilter = "chinese" | "english" | "all";
type POSFilter = "noun" | "verb" | "adjective" | "adverb" | "measure_word" | "other";
type TopicFilter =
  | "food" | "family" | "travel" | "body" | "nature" | "time" | "numbers"
  | "education" | "work" | "emotions" | "daily_life" | "social" | "other";

interface WordClassification { pos: string; topic: string; }

const ALL_CATEGORIES: WordCategory[] = ["regular", "idiom", "phrasal", "collocation"];
const ALL_POS: POSFilter[] = ["noun", "verb", "adjective", "adverb", "measure_word", "other"];
const ALL_TOPICS: TopicFilter[] = ["food", "family", "travel", "body", "education", "work", "emotions", "daily_life", "social", "other"];

function isChinese(text: string): boolean {
  return /[\u4e00-\u9fff\u3400-\u4dbf]/.test(text);
}

function getWordCategory(w: VocabularyWord): WordCategory {
  if (w.isIdiom) return "idiom";
  if (w.isPhrasalVerb) return "phrasal";
  if (w.isCollocation) return "collocation";
  return "regular";
}

function normalizePOS(pos: string): POSFilter {
  const p = pos.toLowerCase();
  if (p.includes("noun")) return "noun";
  if (p.includes("verb")) return "verb";
  if (p.includes("adj")) return "adjective";
  if (p.includes("adv")) return "adverb";
  if (p.includes("measure") || p.includes("classifier")) return "measure_word";
  return "other";
}

function normalizeTopic(topic: string): TopicFilter {
  const t = topic.toLowerCase();
  if (t.includes("food") || t.includes("drink") || t.includes("cook")) return "food";
  if (t.includes("family") || t.includes("relation")) return "family";
  if (t.includes("travel") || t.includes("transport")) return "travel";
  if (t.includes("body") || t.includes("health")) return "body";
  if (t.includes("nature") || t.includes("weather") || t.includes("animal")) return "nature";
  if (t.includes("time") || t.includes("date")) return "time";
  if (t.includes("number") || t.includes("math")) return "numbers";
  if (t.includes("edu") || t.includes("school") || t.includes("learn")) return "education";
  if (t.includes("work") || t.includes("job") || t.includes("business")) return "work";
  if (t.includes("emotion") || t.includes("feel")) return "emotions";
  if (t.includes("daily") || t.includes("life") || t.includes("home") || t.includes("cloth")) return "daily_life";
  if (t.includes("social") || t.includes("greet") || t.includes("commun")) return "social";
  return "other";
}

function toggleInSet<T>(setter: React.Dispatch<React.SetStateAction<Set<T>>>, val: T) {
  setter((prev) => {
    const next = new Set(prev);
    if (next.has(val)) next.delete(val); else next.add(val);
    return next;
  });
}

// ── Sub-components ──
function FilterRow({ label, children, aiPowered, onClassify, isClassifying, allValues, activeValues, onToggleAll }: {
  label: string; children: React.ReactNode; aiPowered?: boolean;
  onClassify?: () => void; isClassifying?: boolean;
  allValues?: unknown[]; activeValues?: Set<unknown>; onToggleAll?: (selectAll: boolean) => void;
}) {
  const allSelected = allValues && activeValues ? activeValues.size === allValues.length : false;
  const noneSelected = activeValues ? activeValues.size === 0 : true;
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        {onToggleAll && (
          <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] text-muted-foreground gap-0.5 ml-auto"
            onClick={() => onToggleAll(noneSelected || !allSelected)}>
            {allSelected ? <Square className="h-3 w-3" /> : <CheckSquare className="h-3 w-3" />}
            {allSelected ? "None" : "All"}
          </Button>
        )}
        {aiPowered && (
          onClassify ? (
            <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] text-primary gap-1" onClick={onClassify} disabled={isClassifying}>
              {isClassifying ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
              {isClassifying ? "..." : "AI"}
            </Button>
          ) : (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-primary/30 text-primary">AI</Badge>
          )
        )}
      </div>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function FilterPill({ active, onClick, disabled, children }: {
  active: boolean; onClick: () => void; disabled?: boolean; children: React.ReactNode;
}) {
  return (
    <Badge
      variant={active ? "default" : "outline"}
      className={`cursor-pointer text-[10px] px-2 py-0.5 select-none transition-colors ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
      onClick={disabled ? undefined : onClick}>
      {children}
    </Badge>
  );
}

// ── Main Component ──
interface WordListPanelProps {
  words: VocabularyWord[];
  excludedIds: Set<string>;
  onExcludedChange: (excluded: Set<string>) => void;
  currentWordId?: string;
  onJumpTo?: (wordId: string) => void;
  open: boolean;
  onClose: () => void;
}

const STORAGE_KEY = "flashcardWordListFilters.v1";

export function WordListPanel({
  words: allWords, excludedIds, onExcludedChange, currentWordId, onJumpTo, open, onClose,
}: WordListPanelProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [fontSize, setFontSize] = useState(20);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const loaded = useMemo(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as {
        languageFilter?: LanguageFilter;
        categoryFilters?: WordCategory[];
        hskFilters?: HSKFilter[];
        frequencyFilters?: FrequencyFilter[];
        charTypeFilters?: CharTypeFilter[];
        posFilters?: POSFilter[];
        topicFilters?: TopicFilter[];
      };
    } catch { return null; }
  }, []);

  const [languageFilter, setLanguageFilter] = useState<LanguageFilter>(loaded?.languageFilter ?? "all");
  const [categoryFilters, setCategoryFilters] = useState<Set<WordCategory>>(new Set(loaded?.categoryFilters ?? ALL_CATEGORIES));
  const [hskFilters, setHskFilters] = useState<Set<HSKFilter>>(new Set(loaded?.hskFilters ?? []));
  const [frequencyFilters, setFrequencyFilters] = useState<Set<FrequencyFilter>>(new Set(loaded?.frequencyFilters ?? []));
  const [charTypeFilters, setCharTypeFilters] = useState<Set<CharTypeFilter>>(new Set(loaded?.charTypeFilters ?? []));
  const [posFilters, setPosFilters] = useState<Set<POSFilter>>(new Set(loaded?.posFilters ?? []));
  const [topicFilters, setTopicFilters] = useState<Set<TopicFilter>>(new Set(loaded?.topicFilters ?? []));
  type SenseFilter = "target-only" | "needs-review";
  const [senseFilters, setSenseFilters] = useState<Set<SenseFilter>>(new Set());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        languageFilter,
        categoryFilters: Array.from(categoryFilters),
        hskFilters: Array.from(hskFilters),
        frequencyFilters: Array.from(frequencyFilters),
        charTypeFilters: Array.from(charTypeFilters),
        posFilters: Array.from(posFilters),
        topicFilters: Array.from(topicFilters),
      }));
    } catch { /* ignore quota */ }
  }, [languageFilter, categoryFilters, hskFilters, frequencyFilters, charTypeFilters, posFilters, topicFilters]);

  // AI classifications
  const [classifications, setClassifications] = useState<Map<string, WordClassification>>(new Map());
  const [isClassifying, setIsClassifying] = useState(false);

  const handleClassifyWords = useCallback(async () => {
    if (allWords.length === 0) return;
    setIsClassifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("classify-words", {
        body: { words: allWords.map((w) => ({ original: w.chinese, translated: w.english, pinyin: w.pinyin })) },
      });
      if (error) throw error;
      const { classifications: cls } = data as { classifications: { index: number; pos: string; topic: string }[] };
      const map = new Map<string, WordClassification>();
      (cls || []).forEach((c) => {
        const w = allWords[c.index];
        if (w) map.set(w.id, { pos: c.pos, topic: c.topic });
      });
      setClassifications(map);
      toast({ title: `Classified ${map.size} words` });
    } catch (err) {
      toast({ title: "Classification failed", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    } finally {
      setIsClassifying(false);
    }
  }, [allWords, toast]);

  const languageStats = useMemo(() => {
    let zhCount = 0, enCount = 0;
    for (const w of allWords) {
      if (isChinese(w.chinese)) zhCount++;
      if (!isChinese(w.chinese)) enCount++;
    }
    return { zhCount, enCount };
  }, [allWords]);

  const wordMatchesFilters = useCallback((w: VocabularyWord): boolean => {
    if (languageFilter === "chinese" && !isChinese(w.chinese)) return false;
    if (languageFilter === "english" && isChinese(w.chinese)) return false;
    if (!categoryFilters.has(getWordCategory(w))) return false;

    if (hskFilters.size > 0) {
      const level = getHSKLevel(w.chinese);
      if (!level || !hskFilters.has(level as HSKFilter)) return false;
    }
    if (frequencyFilters.size > 0) {
      const tier = getFrequencyTier(w.chinese);
      if (tier !== "unknown" && !frequencyFilters.has(tier as FrequencyFilter)) return false;
    }
    if (charTypeFilters.size > 0) {
      const count = getCharacterCount(w.chinese) || w.chinese.trim().split(/\s+/).filter(Boolean).length;
      const type: CharTypeFilter = count <= 1 ? "single" : "multi";
      if (!charTypeFilters.has(type)) return false;
    }
    if (posFilters.size > 0) {
      const cls = classifications.get(w.id);
      if (cls && !posFilters.has(normalizePOS(cls.pos))) return false;
    }
    if (topicFilters.size > 0) {
      const cls = classifications.get(w.id);
      if (cls && !topicFilters.has(normalizeTopic(cls.topic))) return false;
    }
    if (senseFilters.size > 0) {
      const isTargetOnly = Boolean(w.targetOnly);
      const needsReview = Boolean(w.extraColumns?.["Review"]);
      const matches =
        (senseFilters.has("target-only") && isTargetOnly) ||
        (senseFilters.has("needs-review") && needsReview);
      if (!matches) return false;
    }
    return true;
  }, [languageFilter, categoryFilters, hskFilters, frequencyFilters, charTypeFilters, posFilters, topicFilters, senseFilters, classifications]);

  // Visible list = search filter only (filters auto-select instead of hiding)
  const filteredWords = useMemo(() => {
    if (!search.trim()) return allWords;
    const q = search.toLowerCase();
    return allWords.filter((w) =>
      w.chinese.toLowerCase().includes(q) ||
      (w.pinyin && w.pinyin.toLowerCase().includes(q)) ||
      w.english.toLowerCase().includes(q)
    );
  }, [allWords, search]);

  const matchedWords = useMemo(() => allWords.filter(wordMatchesFilters), [allWords, wordMatchesFilters]);

  const activeCount = allWords.filter((w) => !excludedIds.has(w.id)).length;
  const allSelected = filteredWords.length > 0 && filteredWords.every((w) => !excludedIds.has(w.id));

  const activeFilterCount = hskFilters.size + frequencyFilters.size + charTypeFilters.size + posFilters.size + topicFilters.size
    + (languageFilter !== "all" ? 1 : 0)
    + (categoryFilters.size < 4 ? 1 : 0);

  const handleToggle = (id: string) => {
    const next = new Set(excludedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    onExcludedChange(next);
  };

  const handleSelectAll = () => {
    const next = new Set(excludedIds);
    filteredWords.forEach((w) => next.delete(w.id));
    onExcludedChange(next);
  };

  const handleDeselectAll = () => {
    const next = new Set(excludedIds);
    filteredWords.forEach((w) => next.add(w.id));
    const anyActive = allWords.some((w) => !next.has(w.id));
    if (!anyActive && allWords.length > 0) next.delete(allWords[0].id);
    onExcludedChange(next);
  };

  const handleSelectOnlyFiltered = () => {
    const filteredIdSet = new Set(filteredWords.map((w) => w.id));
    const next = new Set<string>();
    allWords.forEach((w) => { if (!filteredIdSet.has(w.id)) next.add(w.id); });
    onExcludedChange(next);
  };

  const hasActiveFilters = activeFilterCount > 0;
  const isShowingSubset = hasActiveFilters && matchedWords.length < allWords.length;

  const handleResetFilters = () => {
    setLanguageFilter("all");
    setCategoryFilters(new Set(ALL_CATEGORIES));
    setHskFilters(new Set()); setFrequencyFilters(new Set());
    setCharTypeFilters(new Set()); setPosFilters(new Set()); setTopicFilters(new Set());
  };

  // Auto-select the matched words whenever filters change
  const lastSyncedKeyRef = useRef<string>("");
  useEffect(() => {
    if (!hasActiveFilters) return;
    const matchedIds = matchedWords.map((w) => w.id).sort().join("|");
    const key = `${allWords.length}::${matchedIds}`;
    if (lastSyncedKeyRef.current === key) return;
    lastSyncedKeyRef.current = key;
    const matchedSet = new Set(matchedWords.map((w) => w.id));
    const next = new Set<string>();
    allWords.forEach((w) => { if (!matchedSet.has(w.id)) next.add(w.id); });
    let changed = next.size !== excludedIds.size;
    if (!changed) {
      for (const id of next) { if (!excludedIds.has(id)) { changed = true; break; } }
    }
    if (changed) onExcludedChange(next);
  }, [hasActiveFilters, matchedWords, allWords, excludedIds, onExcludedChange]);

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="left" className="w-80 sm:w-96 p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-2 border-b border-border space-y-2">
          <SheetTitle className="flex items-center gap-2 text-base">
            <List className="w-4 h-4" />
            Word List ({activeCount}/{allWords.length})
          </SheetTitle>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search words..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>

          {/* Font size */}
          <div className="flex items-center gap-2">
            <Type className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <Slider value={[fontSize]} onValueChange={([v]) => setFontSize(v)} min={20} max={32} step={1} className="flex-1" />
            <span className="text-xs text-muted-foreground w-7 text-right">{fontSize}</span>
          </div>

          {/* Filters */}
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-full text-xs gap-1.5 text-muted-foreground hover:text-foreground">
                <Filter className="h-3.5 w-3.5" />
                Filters
                {activeFilterCount > 0 && <Badge variant="default" className="text-[9px] px-1.5 py-0 ml-1">{activeFilterCount}</Badge>}
                {filtersOpen ? <ChevronUp className="h-3.5 w-3.5 ml-auto" /> : <ChevronDown className="h-3.5 w-3.5 ml-auto" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 pt-1">
              {/* Language */}
              <FilterRow label="Language"
                allValues={["all", "chinese", "english"]}
                activeValues={new Set([languageFilter])}
                onToggleAll={() => setLanguageFilter("all")}>
                <FilterPill active={languageFilter === "all"} onClick={() => setLanguageFilter("all")}>All ({allWords.length})</FilterPill>
                <FilterPill active={languageFilter === "chinese"} onClick={() => setLanguageFilter("chinese")}>中文 ({languageStats.zhCount})</FilterPill>
                <FilterPill active={languageFilter === "english"} onClick={() => setLanguageFilter("english")}>Latin ({languageStats.enCount})</FilterPill>
              </FilterRow>

              {/* Category */}
              <FilterRow label="Category"
                allValues={ALL_CATEGORIES}
                activeValues={categoryFilters}
                onToggleAll={(all) => setCategoryFilters(all ? new Set(ALL_CATEGORIES) : new Set())}>
                <FilterPill active={categoryFilters.has("regular")} onClick={() => toggleInSet(setCategoryFilters, "regular")}>Regular</FilterPill>
                <FilterPill active={categoryFilters.has("idiom")} onClick={() => toggleInSet(setCategoryFilters, "idiom")}>Idiom</FilterPill>
                <FilterPill active={categoryFilters.has("phrasal")} onClick={() => toggleInSet(setCategoryFilters, "phrasal")}>Phrasal</FilterPill>
                <FilterPill active={categoryFilters.has("collocation")} onClick={() => toggleInSet(setCategoryFilters, "collocation")}>Colloc.</FilterPill>
              </FilterRow>

              {/* HSK Level */}
              {/* Senses */}
              <FilterRow label="Senses"
                allValues={["target-only", "needs-review"]}
                activeValues={senseFilters}
                onToggleAll={(all) => setSenseFilters(all ? new Set(["target-only", "needs-review"] as SenseFilter[]) : new Set())}>
                <FilterPill active={senseFilters.has("target-only")} onClick={() => toggleInSet(setSenseFilters, "target-only" as SenseFilter)}>
                  Target-only ({allWords.filter((w) => w.targetOnly).length})
                </FilterPill>
                <FilterPill active={senseFilters.has("needs-review")} onClick={() => toggleInSet(setSenseFilters, "needs-review" as SenseFilter)}>
                  Needs review ({allWords.filter((w) => w.extraColumns?.["Review"]).length})
                </FilterPill>
              </FilterRow>

              <FilterRow label="HSK Level"
                allValues={[1, 2, 3, 4, 5, 6]}
                activeValues={hskFilters}
                onToggleAll={(all) => setHskFilters(all ? new Set([1, 2, 3, 4, 5, 6] as HSKFilter[]) : new Set())}>
                {([1, 2, 3, 4, 5, 6] as HSKFilter[]).map((level) => (
                  <FilterPill key={level} active={hskFilters.has(level)} onClick={() => toggleInSet(setHskFilters, level)}>
                    HSK{level}
                  </FilterPill>
                ))}
              </FilterRow>

              {/* Word */}
              <FilterRow label="Word"
                allValues={["multi"]}
                activeValues={charTypeFilters}
                onToggleAll={(all) => setCharTypeFilters(all ? new Set(["multi"] as CharTypeFilter[]) : new Set())}>
                <FilterPill active={charTypeFilters.has("multi")} onClick={() => toggleInSet(setCharTypeFilters, "multi")}>Word 词</FilterPill>
              </FilterRow>

              {/* Frequency */}
              <FilterRow label="Frequency"
                allValues={["top500", "top1000", "rare"]}
                activeValues={frequencyFilters}
                onToggleAll={(all) => setFrequencyFilters(all ? new Set(["top500", "top1000", "rare"] as FrequencyFilter[]) : new Set())}>
                <FilterPill active={frequencyFilters.has("top500")} onClick={() => toggleInSet(setFrequencyFilters, "top500")}>Top 500</FilterPill>
                <FilterPill active={frequencyFilters.has("top1000")} onClick={() => toggleInSet(setFrequencyFilters, "top1000")}>Top 1000</FilterPill>
                <FilterPill active={frequencyFilters.has("rare")} onClick={() => toggleInSet(setFrequencyFilters, "rare")}>Rare</FilterPill>
              </FilterRow>

              {/* POS (AI) */}
              <FilterRow label="Part of Speech" aiPowered
                onClassify={classifications.size === 0 ? handleClassifyWords : undefined}
                isClassifying={isClassifying}
                allValues={ALL_POS}
                activeValues={posFilters}
                onToggleAll={(all) => setPosFilters(all ? new Set(ALL_POS) : new Set())}>
                {ALL_POS.map((p) => (
                  <FilterPill key={p} active={posFilters.has(p)} onClick={() => toggleInSet(setPosFilters, p)} disabled={classifications.size === 0}>
                    {p === "measure_word" ? "Meas." : p.charAt(0).toUpperCase() + p.slice(1)}
                  </FilterPill>
                ))}
              </FilterRow>

              {/* Topic (AI) */}
              <FilterRow label="Topic" aiPowered
                onClassify={classifications.size === 0 ? handleClassifyWords : undefined}
                isClassifying={isClassifying}
                allValues={ALL_TOPICS}
                activeValues={topicFilters}
                onToggleAll={(all) => setTopicFilters(all ? new Set(ALL_TOPICS) : new Set())}>
                {ALL_TOPICS.map((tp) => (
                  <FilterPill key={tp} active={topicFilters.has(tp)} onClick={() => toggleInSet(setTopicFilters, tp)} disabled={classifications.size === 0}>
                    {tp === "daily_life" ? "Daily" : tp.charAt(0).toUpperCase() + tp.slice(1)}
                  </FilterPill>
                ))}
              </FilterRow>

              {activeFilterCount > 0 && (
                <Button variant="outline" size="sm" className="h-6 text-[10px] w-full" onClick={handleResetFilters}>
                  Reset All Filters
                </Button>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Toggle all */}
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" className="text-xs h-7 flex-1"
              onClick={allSelected ? handleDeselectAll : handleSelectAll}>
              {allSelected ? <Square className="w-3.5 h-3.5 mr-1" /> : <CheckSquare className="w-3.5 h-3.5 mr-1" />}
              {allSelected ? "Deselect All" : "Select All"}
            </Button>
            {isShowingSubset && (
              <Button size="sm" variant="default" className="text-xs h-7 flex-1" onClick={handleSelectOnlyFiltered}>
                <CheckSquare className="w-3.5 h-3.5 mr-1" />
                Only These ({filteredWords.length})
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-0.5">
            {filteredWords.map((w) => {
              const isActive = !excludedIds.has(w.id);
              const globalIndex = allWords.indexOf(w);
              const hskLevel = getHSKLevel(w.chinese);
              const cls = classifications.get(w.id);
              return (
                <div
                  key={w.id}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-accent/50 transition-colors ${w.id === currentWordId ? "bg-accent/40" : ""}`}
                >
                  <Checkbox checked={isActive} onCheckedChange={() => handleToggle(w.id)} />
                  <button
                    type="button"
                    className="flex-1 min-w-0 text-left"
                    onClick={() => isActive && onJumpTo?.(w.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground shrink-0" style={{ fontSize: fontSize * 0.75 }}>{globalIndex + 1}</span>
                      <span className="font-medium truncate" style={{ fontSize }}>{w.chinese}</span>
                      {w.isIdiom && <Badge variant="secondary" className="text-[8px] px-1 py-0">Idiom</Badge>}
                      {w.isPhrasalVerb && <Badge variant="secondary" className="text-[8px] px-1 py-0">Phrasal</Badge>}
                      {w.isCollocation && <Badge variant="secondary" className="text-[8px] px-1 py-0">Colloc.</Badge>}
                      {hskLevel && <Badge variant="outline" className="text-[8px] px-1 py-0 border-primary/40 text-primary">HSK{hskLevel}</Badge>}
                      {cls && <Badge variant="outline" className="text-[8px] px-1 py-0 border-muted-foreground/30 text-muted-foreground">{cls.pos}</Badge>}
                    </div>
                    <div className="flex items-center gap-2 ml-7">
                      {w.pinyin && <span className="text-muted-foreground" style={{ fontSize: fontSize * 0.8 }}>{w.pinyin}</span>}
                      <span className="text-muted-foreground truncate" style={{ fontSize: fontSize * 0.8 }}>{w.english}</span>
                    </div>
                  </button>
                </div>
              );
            })}
            {filteredWords.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                {search ? `No words match "${search}"` : "No words match current filters"}
              </p>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
