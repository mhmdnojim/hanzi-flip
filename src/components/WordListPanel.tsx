import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, CheckSquare, Square, Star } from "lucide-react";
import { VocabularyWord } from "@/types/vocabulary";
import { cn } from "@/lib/utils";

type Category = "regular" | "idiom" | "phrasal" | "collocation";
type LengthBucket = "single" | "multi";
type StatusBucket = "favorite" | "correct" | "incorrect" | "new";
type ExampleBucket = "with" | "without";

const ALL_CATEGORIES: readonly Category[] = ["regular", "idiom", "phrasal", "collocation"];
const ALL_LENGTHS: readonly LengthBucket[] = ["single", "multi"];
const ALL_STATUSES: readonly StatusBucket[] = ["new", "favorite", "correct", "incorrect"];
const ALL_EXAMPLES: readonly ExampleBucket[] = ["with", "without"];

const CATEGORY_NAMES: Record<Category, string> = {
  regular: "Regular", idiom: "Idiom", phrasal: "Phrasal verb", collocation: "Collocation",
};
const LENGTH_NAMES: Record<LengthBucket, string> = { single: "Single", multi: "Multi" };
const STATUS_NAMES: Record<StatusBucket, string> = {
  new: "New", favorite: "Favorite", correct: "Correct", incorrect: "Incorrect",
};
const EXAMPLE_NAMES: Record<ExampleBucket, string> = { with: "Has example", without: "No example" };

function categoryOf(w: VocabularyWord): Category {
  if (w.isIdiom) return "idiom";
  if (w.isPhrasalVerb) return "phrasal";
  if (w.isCollocation) return "collocation";
  return "regular";
}
function lengthOf(w: VocabularyWord): LengthBucket {
  const text = (w.chinese || "").trim();
  const units = /[\u4e00-\u9fff]/.test(text) ? text.replace(/\s/g, "").length : text.split(/\s+/).filter(Boolean).length;
  return units <= 1 ? "single" : "multi";
}
function statusOf(w: VocabularyWord): StatusBucket {
  if (w.favorite) return "favorite";
  if ((w.correctCount || 0) > 0) return "correct";
  if ((w.incorrectCount || 0) > 0) return "incorrect";
  return "new";
}

interface WordListPanelProps {
  words: VocabularyWord[];
  excludedIds: Set<string>;
  onExcludedChange: (next: Set<string>) => void;
  currentWordId?: string;
  onJumpTo: (wordId: string) => void;
  open: boolean;
  onClose: () => void;
}

export function WordListPanel({
  words, excludedIds, onExcludedChange, currentWordId, onJumpTo, open, onClose,
}: WordListPanelProps) {
  const [query, setQuery] = useState("");
  const [categories, setCategories] = useState<Set<Category>>(new Set(ALL_CATEGORIES));
  const [lengths, setLengths] = useState<Set<LengthBucket>>(new Set(ALL_LENGTHS));
  const [statuses, setStatuses] = useState<Set<StatusBucket>>(new Set(ALL_STATUSES));
  const [examples, setExamples] = useState<Set<ExampleBucket>>(new Set(ALL_EXAMPLES));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return words.filter((w) => {
      if (q &&
        !w.chinese.toLowerCase().includes(q) &&
        !w.english.toLowerCase().includes(q) &&
        !(w.pinyin || "").toLowerCase().includes(q)) return false;
      if (!categories.has(categoryOf(w))) return false;
      if (!lengths.has(lengthOf(w))) return false;
      if (!statuses.has(statusOf(w))) return false;
      if (!examples.has(w.exampleSentence ? "with" : "without")) return false;
      return true;
    });
  }, [words, query, categories, lengths, statuses, examples]);

  const toggleOne = (id: string) => {
    const next = new Set(excludedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    onExcludedChange(next);
  };

  const includeAll = () => onExcludedChange(new Set());
  const excludeAll = () => onExcludedChange(new Set(words.map((w) => w.id)));
  const includeOnlyFiltered = () => {
    const visible = new Set(filtered.map((w) => w.id));
    const next = new Set(words.filter((w) => !visible.has(w.id)).map((w) => w.id));
    onExcludedChange(next);
  };

  const activeCount = words.length - excludedIds.size;

  const filterRows = [
    { label: "Category", options: ALL_CATEGORIES, selected: categories, set: setCategories as (v: Set<string>) => void, names: CATEGORY_NAMES as Record<string, string> },
    { label: "Word", options: ALL_LENGTHS, selected: lengths, set: setLengths as (v: Set<string>) => void, names: LENGTH_NAMES as Record<string, string> },
    { label: "Status", options: ALL_STATUSES, selected: statuses, set: setStatuses as (v: Set<string>) => void, names: STATUS_NAMES as Record<string, string> },
    { label: "Example", options: ALL_EXAMPLES, selected: examples, set: setExamples as (v: Set<string>) => void, names: EXAMPLE_NAMES as Record<string, string> },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed top-0 right-0 bottom-0 w-full sm:w-[380px] bg-background z-50 shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between p-3 border-b">
              <div>
                <h3 className="font-bold text-sm">Word list</h3>
                <p className="text-xs text-muted-foreground">
                  {activeCount} active · {excludedIds.size} excluded · {words.length} total
                </p>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 border-b space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-8 pr-2 py-1.5 text-sm bg-muted rounded-md border border-input outline-none focus:ring-2 ring-primary/40"
                />
              </div>
              <div className="flex gap-1.5 text-[11px]">
                <button onClick={includeAll} className="px-2 py-1 rounded bg-muted hover:bg-muted/80">Include all</button>
                <button onClick={excludeAll} className="px-2 py-1 rounded bg-muted hover:bg-muted/80">Exclude all</button>
                <button onClick={includeOnlyFiltered} className="px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20">
                  Include only filtered
                </button>
              </div>

              {filterRows.map((row) => {
                const allOn = row.options.every((o) => row.selected.has(o as never));
                return (
                  <div key={row.label} className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => row.set(new Set(allOn ? [] : (row.options as readonly string[])))}
                      className="text-[10px] uppercase tracking-wide text-muted-foreground w-14 text-left hover:text-foreground"
                    >
                      {row.label}
                    </button>
                    {(row.options as readonly string[]).map((opt) => {
                      const on = row.selected.has(opt as never);
                      return (
                        <button
                          key={opt}
                          onClick={() => {
                            const next = new Set(row.selected as Set<string>);
                            if (next.has(opt)) next.delete(opt); else next.add(opt);
                            row.set(next);
                          }}
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[11px] border transition-colors",
                            on ? "bg-primary/15 border-primary/40 text-primary" : "bg-muted border-transparent text-muted-foreground"
                          )}
                        >
                          {row.names[opt]}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            <div className="flex-1 overflow-y-auto">
              {filtered.map((w) => {
                const isExcluded = excludedIds.has(w.id);
                const isCurrent = w.id === currentWordId;
                return (
                  <div
                    key={w.id}
                    className={cn(
                      "flex items-start gap-2 px-3 py-2 border-b hover:bg-muted/50 transition-colors",
                      isCurrent && "bg-primary/5"
                    )}
                  >
                    <button onClick={() => toggleOne(w.id)} className="mt-0.5 shrink-0">
                      {isExcluded
                        ? <Square className="w-4 h-4 text-muted-foreground" />
                        : <CheckSquare className="w-4 h-4 text-primary" />}
                    </button>
                    <button
                      onClick={() => !isExcluded && onJumpTo(w.id)}
                      disabled={isExcluded}
                      className={cn(
                        "flex-1 text-left min-w-0",
                        isExcluded && "opacity-40"
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-sm truncate">{w.chinese}</p>
                        {w.favorite && <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />}
                      </div>
                      {w.pinyin && <p className="text-[11px] text-muted-foreground truncate">{w.pinyin}</p>}
                      <p className="text-xs text-muted-foreground truncate">{w.english}</p>
                    </button>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <p className="text-center text-xs text-muted-foreground py-8">No matches.</p>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}