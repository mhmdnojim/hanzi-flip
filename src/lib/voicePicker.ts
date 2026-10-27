/**
 * Picks the best browser voice for a language, preferring the high-quality
 * Google and Microsoft voices (e.g. "Google 普通话", "Microsoft Xiaoxiao Online
 * (Natural)") and the exact accent/region of the requested locale.
 */
export interface VoiceLike {
  name: string;
  lang: string;
  localService?: boolean;
  default?: boolean;
}

const norm = (lang: string) => lang.replace(/_/g, "-").toLowerCase();

function qualityScore(v: VoiceLike): number {
  const n = v.name.toLowerCase();
  let score = 0;
  if (n.includes("microsoft") && (n.includes("natural") || n.includes("online"))) score += 40;
  else if (n.includes("google")) score += 35;
  else if (n.includes("microsoft")) score += 25;
  if (n.includes("neural") || n.includes("premium") || n.includes("enhanced")) score += 10;
  if (n.includes("compact") || n.includes("espeak")) score -= 20;
  return score;
}

export function pickVoice<T extends VoiceLike>(voices: T[], locale: string): T | undefined {
  if (!voices.length || !locale) return undefined;
  const want = norm(locale);
  const wantBase = want.split("-")[0];
  let best: T | undefined;
  let bestScore = -Infinity;
  for (const v of voices) {
    const lang = norm(v.lang || "");
    const base = lang.split("-")[0];
    if (base !== wantBase) continue;
    // Exact accent first (zh-CN over zh-TW, en-US over en-GB)
    let score = lang === want ? 100 : 0;
    score += qualityScore(v);
    if (score > bestScore) {
      best = v;
      bestScore = score;
    }
  }
  return best;
}
