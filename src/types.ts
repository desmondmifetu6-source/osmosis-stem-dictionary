export type SubjectCategory =
  | 'All'
  | 'Biology'
  | 'Chemistry'
  | 'Physics'
  | 'Agric Science'
  | 'Computing / ICT'
  | 'Mathematics'
  | 'General STEM';

export const SUBJECT_FILTERS: SubjectCategory[] = [
  'All',
  'Biology',
  'Chemistry',
  'Physics',
  'Agric Science',
  'Computing / ICT',
  'Mathematics',
];

export interface RawDictionaryEntry {
  word: string;
  raw_headword?: string;
  raw?: string;
  synonyms?: string[];
  definition: string;
}

export interface DictionaryEntry {
  idx: number;
  word: string;
  displayWord: string;
  rawHeadword: string;
  synonyms: string[];
  definition: string;
  letter: string;
  subject: Exclude<SubjectCategory, 'All'>;
  diagramPath: string | null;
}

export interface DiagramHubItem {
  primaryTerm: string;
  terms: string[];
  image: string;
  entryIdx: number | null;
}

export interface RevisionBookmark {
  word: string;
  displayWord: string;
  subject: Exclude<SubjectCategory, 'All'>;
  definition: string;
  synonyms: string[];
  diagramPath: string | null;
  savedAt: number;
  reviewCount: number;
  masteryLevel: number; // 0 = New, 1 = Learning, 2 = Familiar, 3 = Mastered
  nextReviewAt: number;
  lastReviewedAt?: number;
}

export interface QuizQuestion {
  entry: DictionaryEntry;
  promptDefinition: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface SubjectCounts {
  All: number;
  Biology: number;
  Chemistry: number;
  Physics: number;
  'Agric Science': number;
  'Computing / ICT': number;
  Mathematics: number;
  'General STEM': number;
}
