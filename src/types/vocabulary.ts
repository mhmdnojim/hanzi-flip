export interface VocabularyWord {
  id: string;
  chinese: string;
  pinyin: string;
  english: string;
  favorite?: boolean;
  correctCount?: number;
  incorrectCount?: number;
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

export type AutoplayMode = 'off' | 'chinese' | 'english' | 'chinese-to-english' | 'english-to-chinese';
export type VoiceType = 'free' | 'premium';
export type StorageMode = 'local' | 'cloud';
