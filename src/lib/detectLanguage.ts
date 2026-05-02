/**
 * Lightweight script-based language detection. Returns a BCP-47-ish language
 * code suitable for the Web Speech API (e.g. "zh-CN", "en-US", "ar-SA").
 */
export function detectLanguageCodeFromText(text: string | undefined | null): string {
  if (!text) return 'en-US';
  const s = String(text);
  if (/[\u4e00-\u9fff\u3400-\u4dbf]/.test(s)) return 'zh-CN';
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(s)) return 'ja-JP';
  if (/[\uac00-\ud7af]/.test(s)) return 'ko-KR';
  if (/[\u0600-\u06ff\u0750-\u077f\ufb50-\ufdff\ufe70-\ufeff]/.test(s)) return 'ar-SA';
  if (/[\u0400-\u04ff]/.test(s)) return 'ru-RU';
  if (/[\u0900-\u097f]/.test(s)) return 'hi-IN';
  if (/[\u0e00-\u0e7f]/.test(s)) return 'th-TH';
  if (/[\u0590-\u05ff]/.test(s)) return 'he-IL';
  if (/[äöüß]/i.test(s)) return 'de-DE';
  if (/[àâçéèêëîïôûùüÿœæ]/i.test(s)) return 'fr-FR';
  if (/[ğıİşçöü]/i.test(s)) return 'tr-TR';
  if (/[áéíñóúü¿¡]/i.test(s)) return 'es-ES';
  return 'en-US';
}

/** Friendly language name (used in UI labels) */
export function detectLanguageNameFromText(text: string | undefined | null): string {
  const code = detectLanguageCodeFromText(text);
  const map: Record<string, string> = {
    'zh-CN': 'Chinese',
    'ja-JP': 'Japanese',
    'ko-KR': 'Korean',
    'ar-SA': 'Arabic',
    'ru-RU': 'Russian',
    'hi-IN': 'Hindi',
    'th-TH': 'Thai',
    'he-IL': 'Hebrew',
    'de-DE': 'German',
    'fr-FR': 'French',
    'tr-TR': 'Turkish',
    'es-ES': 'Spanish',
    'en-US': 'English',
  };
  return map[code] || 'English';
}