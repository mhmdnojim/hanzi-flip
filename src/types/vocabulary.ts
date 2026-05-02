export interface VocabularyWord {
  id: string;
  chinese: string;
  pinyin: string;
  english: string;
  favorite?: boolean;
  correctCount?: number;
  incorrectCount?: number;
  /** Optional explanation/notes shown under the original side */
  explanation?: string;
  /** Example sentence in the same language as `chinese` (the original) */
  exampleSentence?: string;
  /** Extra columns from the imported spreadsheet (label -> text) */
  extraColumns?: Record<string, string>;
}

export interface VocabularyDeck {
  id: string;
  name: string;
  words: VocabularyWord[];
  createdAt: Date;
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
