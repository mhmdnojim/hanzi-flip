import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MAIN_LANGUAGES, getLanguage, romanizationCodeFor } from "@/utils/languages";
import type { SheetPreview } from "@/utils/excelParser";

const IGNORE = "__ignore__";

interface Option {
  value: string;
  label: string;
  hint?: string;
}

/** Every assignable column role: each language + its Latin transcription */
function buildOptions(): Option[] {
  const out: Option[] = [];
  for (const lang of MAIN_LANGUAGES) {
    out.push({ value: lang.code, label: lang.name, hint: lang.native });
    const rom = romanizationCodeFor(lang.code);
    if (rom) {
      out.push({
        value: rom,
        label: `${lang.name} — ${lang.romanizationLabel || "Latin transliteration"}`,
      });
    }
  }
  return out;
}

interface Props {
  preview: SheetPreview | null;
  /** how many files are still queued after this one */
  remaining?: number;
  onConfirm: (mapping: Record<string, string | null>) => void;
  onCancel: () => void;
}

export function ColumnMappingDialog({ preview, remaining = 0, onConfirm, onCancel }: Props) {
  const options = useMemo(buildOptions, []);
  const [mapping, setMapping] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (preview) setMapping({ ...preview.suggestion });
  }, [preview]);

  if (!preview) return null;

  const assignedCount = Object.values(mapping).filter(
    (c) => c && !getLanguage(c).romanizationOf,
  ).length;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Check the columns of “{preview.filename}”</DialogTitle>
          <DialogDescription>
            We guessed which column holds each language and which holds its Latin
            transliteration. Fix anything that's wrong before importing.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[55vh] overflow-y-auto space-y-3 pr-1">
          {preview.headers.map((header) => {
            const value = mapping[header] ?? IGNORE;
            const isRom = mapping[header] ? !!getLanguage(mapping[header]!).romanizationOf : false;
            return (
              <div
                key={header}
                className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg border border-border p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{header}</span>
                    {isRom && <Badge variant="secondary" className="text-[10px]">Latin</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {preview.samples[header]?.join(" · ") || "— empty —"}
                  </p>
                </div>
                <Select
                  value={value}
                  onValueChange={(v) =>
                    setMapping((prev) => ({ ...prev, [header]: v === IGNORE ? null : v }))
                  }
                >
                  <SelectTrigger className="w-full sm:w-[290px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] bg-popover z-50">
                    <SelectItem value={IGNORE}>Not a language (ignore)</SelectItem>
                    {options.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </div>

        <DialogFooter className="sm:justify-between">
          <span className="text-xs text-muted-foreground self-center">
            {assignedCount} language{assignedCount === 1 ? "" : "s"} selected
            {remaining > 0 && ` · ${remaining} more file${remaining === 1 ? "" : "s"} after this`}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>Skip file</Button>
            <Button disabled={assignedCount === 0} onClick={() => onConfirm(mapping)}>
              Import
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}