import { CustomSequenceStep } from '@/types/vocabulary';

const PRESETS_KEY = 'flashcard_custom_sequence_presets_v1';
const LAST_ACTIVE_KEY = 'flashcard_custom_sequence_last_active_v1';

export interface SequencePreset {
  id: string;
  name: string;
  steps: CustomSequenceStep[];
  /** epoch ms */
  updatedAt: number;
}

function isValidStep(s: any): s is CustomSequenceStep {
  return s && typeof s === 'object'
    && (s.track === 'original' || s.track === 'translation' || s.track === 'example')
    && typeof s.repeat === 'number';
}

export function loadSequencePresets(): SequencePreset[] {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((p: any) =>
        p && typeof p.id === 'string' && typeof p.name === 'string'
        && Array.isArray(p.steps) && p.steps.every(isValidStep)
      )
      .map((p: any) => ({
        id: p.id,
        name: p.name,
        steps: p.steps,
        updatedAt: typeof p.updatedAt === 'number' ? p.updatedAt : Date.now(),
      }));
  } catch {
    return [];
  }
}

export function saveSequencePresets(list: SequencePreset[]): void {
  try { localStorage.setItem(PRESETS_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

export function getLastActivePresetId(): string | null {
  try { return localStorage.getItem(LAST_ACTIVE_KEY); } catch { return null; }
}

export function setLastActivePresetId(id: string | null): void {
  try {
    if (id === null) localStorage.removeItem(LAST_ACTIVE_KEY);
    else localStorage.setItem(LAST_ACTIVE_KEY, id);
  } catch { /* ignore */ }
}

export function genPresetId(): string {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function sequenceSignature(steps: CustomSequenceStep[]): string {
  return steps.map(s => `${s.track}:${s.repeat}`).join('|');
}