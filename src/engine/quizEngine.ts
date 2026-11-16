import { DictionaryEntry, QuizQuestion, SubjectCategory } from '../types';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function maskTargetInDefinition(definition: string, entry: DictionaryEntry): string {
  let masked = definition;
  const termsToMask = [entry.word, entry.displayWord, ...entry.synonyms]
    .map((t) => t.trim())
    .filter((t) => t.length >= 3)
    .sort((a, b) => b.length - a.length);

  for (const term of termsToMask) {
    const rx = new RegExp(`\\b${escapeRegex(term)}\\b`, 'gi');
    masked = masked.replace(rx, '________');
  }
  return masked;
}

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function formatOptionLabel(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function pickSameSubjectDistractors(
  target: DictionaryEntry,
  allEntries: DictionaryEntry[],
  needed: number,
  excludeLower: Set<string>
): string[] {
  const targetLen = target.word.length;
  const isMultiWord = target.word.includes(' ') || target.word.includes('-');

  // Gather candidate pool from same subject first, then general pool
  const sameSubject: DictionaryEntry[] = [];
  const otherPool: DictionaryEntry[] = [];

  // Sample deterministically/randomly across the 27,734 entries to stay <2ms
  const step = Math.max(1, Math.floor(allEntries.length / 1200));
  const offset = Math.floor(Math.random() * step);

  for (let i = offset; i < allEntries.length; i += step) {
    const e = allEntries[i];
    const wLower = e.word.toLowerCase();
    if (excludeLower.has(wLower)) continue;
    if (wLower.length < 3 || wLower.length > 42) continue;

    if (e.subject === target.subject) {
      sameSubject.push(e);
    } else {
      otherPool.push(e);
    }
  }

  const scoreCandidate = (e: DictionaryEntry) => {
    const multiMatch = (e.word.includes(' ') || e.word.includes('-')) === isMultiWord ? 0 : 12;
    return multiMatch + Math.abs(e.word.length - targetLen);
  };

  sameSubject.sort((a, b) => scoreCandidate(a) - scoreCandidate(b));
  const picked: string[] = [];

  for (const e of sameSubject) {
    const wLower = e.word.toLowerCase();
    if (!excludeLower.has(wLower)) {
      excludeLower.add(wLower);
      picked.push(e.displayWord || e.word);
      if (picked.length >= needed) return picked;
    }
  }

  otherPool.sort((a, b) => scoreCandidate(a) - scoreCandidate(b));
  for (const e of otherPool) {
    const wLower = e.word.toLowerCase();
    if (!excludeLower.has(wLower)) {
      excludeLower.add(wLower);
      picked.push(e.displayWord || e.word);
      if (picked.length >= needed) return picked;
    }
  }

  return picked;
}

export function buildQuizQuestion(
  entry: DictionaryEntry,
  allEntries: DictionaryEntry[]
): QuizQuestion {
  const targetDisplay = entry.displayWord || entry.word;
  const targetLower = entry.word.toLowerCase();
  const excludeLower = new Set<string>([
    targetLower,
    targetDisplay.toLowerCase(),
    ...entry.synonyms.map((s) => s.toLowerCase()),
  ]);

  let distractors: string[] = [];
  const isCleanSingleWord = /^[a-zA-Z]{3,}$/.test(entry.word);

  if (isCleanSingleWord && window.DistractorEngine?.getDistractors) {
    try {
      const enginePicks = window.DistractorEngine.getDistractors(entry.word, 3, {
        exclude: Array.from(excludeLower),
        preserveCase: false,
      });
      for (const d of enginePicks) {
        const clean = d.trim();
        if (clean && !excludeLower.has(clean.toLowerCase())) {
          excludeLower.add(clean.toLowerCase());
          distractors.push(formatOptionLabel(clean));
        }
      }
    } catch {
      // fall through to subject-matched sampler
    }
  }

  if (distractors.length < 3) {
    const extra = pickSameSubjectDistractors(
      entry,
      allEntries,
      3 - distractors.length,
      excludeLower
    );
    distractors = distractors.concat(extra.map(formatOptionLabel));
  }

  const correctLabel = formatOptionLabel(targetDisplay);
  const options = shuffleArray([correctLabel, ...distractors.slice(0, 3)]);
  const maskedDef = maskTargetInDefinition(entry.definition, entry);

  return {
    entry,
    promptDefinition: maskedDef,
    options,
    correctAnswer: correctLabel,
    explanation: entry.definition,
  };
}

export function buildSubjectBlitzQuestions(
  subject: SubjectCategory,
  allEntries: DictionaryEntry[],
  count = 5
): QuizQuestion[] {
  const candidates = allEntries.filter((e) => {
    if (subject !== 'All' && e.subject !== subject) return false;
    const len = e.definition.length;
    return len >= 55 && len <= 420 && e.word.length >= 3;
  });

  const pool = candidates.length >= count ? candidates : allEntries;
  const chosen: DictionaryEntry[] = [];
  const usedWords = new Set<string>();

  let attempts = 0;
  while (chosen.length < count && attempts < 200) {
    attempts++;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (!pick) continue;
    const key = pick.word.toLowerCase();
    if (usedWords.has(key)) continue;
    usedWords.add(key);
    chosen.push(pick);
  }

  return chosen.map((entry) => buildQuizQuestion(entry, allEntries));
}
