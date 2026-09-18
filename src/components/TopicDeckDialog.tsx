import { useEffect, useMemo, useState } from "react";
import { Sparkles, Loader2, Check, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export interface TopicOption {
  id: string;
  name: string;
  wordCount: number;
}

interface TopicDeckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  frontLanguageName: string;
  backLanguageName: string;
  generating: boolean;
  /** Existing AI topics the user can add more words to */
  existingTopics?: TopicOption[];
  onGenerate: (topic: string, count: number, existingDeckId?: string) => void;
}

export function TopicDeckDialog(props: TopicDeckDialogProps) {
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(30);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const topics = props.existingTopics ?? [];

  useEffect(() => {
    if (props.open) {
      setTopic("");
      setSelectedId(null);
    }
  }, [props.open]);

  const filtered = useMemo(() => {
    const q = topic.trim().toLowerCase();
    if (!q) return topics;
    return topics.filter((t) => t.name.toLowerCase().includes(q));
  }, [topics, topic]);

  const canGenerate = topic.trim().length > 1 && !props.generating;

  const submit = () => {
    if (!canGenerate) return;
    props.onGenerate(topic.trim(), count, selectedId ?? undefined);
  };

  const pick = (t: TopicOption) => {
    if (selectedId === t.id) {
      setSelectedId(null);
      setTopic("");
      return;
    }
    setSelectedId(t.id);
    setTopic(t.name);
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            {selectedId ? "Add more words to this topic" : "Create a deck with AI"}
          </DialogTitle>
          <DialogDescription>
            Pick one of your topics to add more words, or type a new one:{" "}
            {props.frontLanguageName} on the front, {props.backLanguageName} on the back.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label htmlFor="topic-deck-topic">Topic</Label>
            <Input
              id="topic-deck-topic"
              placeholder='Type a topic, e.g. "Airport travel", "At the restaurant"'
              value={topic}
              onChange={(e) => {
                setTopic(e.target.value);
                setSelectedId(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              autoFocus
              disabled={props.generating}
            />

            {topics.length > 0 && (
              <div className="rounded-lg border max-h-40 overflow-y-auto">
                {filtered.length === 0 ? (
                  <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                    <Plus className="w-3.5 h-3.5" />
                    New topic “{topic.trim()}”
                  </div>
                ) : (
                  filtered.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => pick(t)}
                      disabled={props.generating}
                      className={cn(
                        "w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left hover:bg-accent transition-colors",
                        selectedId === t.id && "bg-accent",
                      )}
                    >
                      <span className="flex items-center gap-2 truncate">
                        {selectedId === t.id ? (
                          <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        )}
                        <span className="truncate">{t.name}</span>
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                        {t.wordCount} words
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{selectedId ? "Words to add" : "Number of words"}</Label>
              <span className="text-sm font-medium tabular-nums">{count}</span>
            </div>
            <Slider
              min={10}
              max={100}
              step={5}
              value={[count]}
              onValueChange={([v]) => setCount(v)}
              disabled={props.generating}
            />
            <p className="text-xs text-muted-foreground">
              {selectedId
                ? "New words are added to the existing topic, skipping ones it already has."
                : "Between 10 and 100 words."}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => props.onOpenChange(false)} disabled={props.generating}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canGenerate} className="gap-2">
            {props.generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {selectedId ? "Add words" : "Generate deck"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
