export interface VocabularyWord {
  id: string;
  chinese: string;
  pinyin: string;
  english: string;
  /** language code -> text, for multi-language imported sheets */
  values?: Record<string, string>;
  favorite?: boolean;
  correctCount?: number;
  incorrectCount?: number;
  /** Optional explanation/notes shown under the original side */
  explanation?: string;
  /** Example sentence in the same language as `chinese` (the original) */
  exampleSentence?: string;
  /** Translation of the example sentence (translation side) */
  exampleTranslation?: string;
  /** Romanization of the example sentence */
  examplePinyin?: string;
  isIdiom?: boolean;
  isPhrasalVerb?: boolean;
  isCollocation?: boolean;
  /** Extra columns from the imported spreadsheet (label -> text) */
  extraColumns?: Record<string, string>;
  /** Meanings (comma-separated chunks of the translation) the user unchecked — hidden on the card */
  hiddenMeanings?: string[];
  /** Per-language disambiguating note for this sense (language code -> note) */
  senseNotes?: Record<string, string>;
  /** Note for the currently selected study language (filled in when projecting) */
  senseNote?: string;
  /** Card built from a target-language sense that has no anchor in the source language */
  targetOnly?: boolean;
}

export interface VocabularyDeck {
  id: string;
  name: string;
  words: VocabularyWord[];
  createdAt: Date;
  /** language codes present in this deck (real languages + transcriptions) */
  languages?: string[];
  /** Original spreadsheet layout, used to write edits back to the .xlsx file */
  columns?: {
    headers: string[];
    /** header -> language code */
    mapping: Record<string, string>;
    exampleCol?: string;
    explanationCol?: string;
    sheetName?: string;
  };
}

export interface StudyProgress {
  currentIndex: number;
  correctTotal: number;
  incorrectTotal: number;
  startTime: Date;
  completedWords: string[];
}

export type AutoplayMode =
  | 'off'
  | 'chinese'
  | 'english'
  | 'chinese-to-english'
  | 'english-to-chinese'
  | 'custom';
export type VoiceType = 'free' | 'premium';
export type StorageMode = 'local' | 'cloud';

/** A single step in a user-defined playback sequence */
export type CustomSequenceTrack = 'original' | 'translation' | 'example';

export interface CustomSequenceStep {
  track: CustomSequenceTrack;
  /** How many times to repeat this single step before moving to the next */
  repeat: number;
}
