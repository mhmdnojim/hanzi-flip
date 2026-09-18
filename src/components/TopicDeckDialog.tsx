import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
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

interface TopicDeckDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  frontLanguageName: string;
  backLanguageName: string;
  generating: boolean;
  onGenerate: (topic: string, count: number) => void;
}

export function TopicDeckDialog(props: TopicDeckDialogProps) {
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(30);

  const canGenerate = topic.trim().length > 1 && !props.generating;

  const submit = () => {
    if (!canGenerate) return;
    props.onGenerate(topic.trim(), count);
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Create a deck with AI
          </DialogTitle>
          <DialogDescription>
            Type a topic and AI builds a flashcard deck: {props.frontLanguageName} on the front,{" "}
            {props.backLanguageName} on the back.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label htmlFor="topic-deck-topic">Topic</Label>
            <Input
              id="topic-deck-topic"
              placeholder='e.g. "Airport travel", "At the restaurant", "Job interview"'
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              autoFocus
              disabled={props.generating}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Number of words</Label>
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
            <p className="text-xs text-muted-foreground">Between 10 and 100 words.</p>
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
                Generate deck
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
