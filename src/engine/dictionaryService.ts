import {
  DiagramHubItem,
  DictionaryEntry,
  RawDictionaryEntry,
  SubjectCategory,
  SubjectCounts,
} from '../types';

declare global {
  interface Window {
    STEMDictionary?: {
      wordBank: Record<string, RawDictionaryEntry[]>;
      getEntry: (query: string) => RawDictionaryEntry | null;
      getWordsByLetter: (letter: string) => RawDictionaryEntry[];
      getAllWords: () => RawDictionaryEntry[];
      getAllEntries?: () => RawDictionaryEntry[];
      predictWords: (query: string, limit?: number) => Array<{ word: string; display?: string; definition?: string }>;
    };
    DictionaryDiagrams?: Record<string, string>;
    DiagramLibrary?: Record<string, { id: string; title: string; image: string; labels: string[] }>;
    renderScienceText?: (target: HTMLElement | string, options?: Record<string, unknown>) => string;
    FormulaRenderer?: {
      render: (target: HTMLElement | string, options?: Record<string, unknown>) => string;
      format: (text: string) => string;
      loadKaTeX: () => Promise<unknown>;
    };
    DistractorEngine?: {
      getDistractors: (
        targetWord: string,
        count?: number,
        options?: { exactLengthOnly?: boolean; exclude?: string[]; preserveCase?: boolean }
      ) => string[];
      generateSentenceOptions: (
        correctWord: string,
        sentenceContext: string,
        neededDistractors?: number
      ) => { blankedSentence: string; options: string[]; correctAnswer: string };
    };
    VoiceManager?: {
      init: () => void;
      speak: (
        text: string,
        options?: {
          force?: boolean;
          rate?: number;
          pitch?: number;
          volume?: number;
          onend?: () => void;
          onerror?: () => void;
        }
      ) => void;
      stop: () => void;
      isSpeaking: () => boolean;
      isPaused: () => boolean;
      pause: () => void;
      resume: () => void;
    };
    AudioManager?: {
      init: () => void;
      play: (type: 'click' | 'chip' | 'success' | 'error' | 'warp' | 'gem' | 'levelup' | 'fanfare') => void;
    };
  }
}

const DEFAULT_COUNTS: SubjectCounts = {
  All: 0,
  Biology: 0,
  Chemistry: 0,
  Physics: 0,
  'Agric Science': 0,
  'Computing / ICT': 0,
  Mathematics: 0,
  'General STEM': 0,
};

function loadScriptOnce(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-core-src="${src}"]`);
    if (existing) {
      if (existing.getAttribute('data-loaded') === 'true') {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.setAttribute('data-core-src', src);
    script.onload = () => {
      script.setAttribute('data-loaded', 'true');
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

function stripAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function resolveDiagramForEntry(
  raw: RawDictionaryEntry,
  diagramMap: Record<string, string>,
  diagramLib?: Record<string, { id: string; title: string; image: string; labels: string[] }>
): string | null {
  const candidates: string[] = [];
  if (raw.word) candidates.push(raw.word.trim().toLowerCase());
  const rawHead = (raw.raw_headword || raw.raw || '').trim().toLowerCase();
  if (rawHead) {
    candidates.push(rawHead);
    const base = rawHead.split('(')[0].trim();
    if (base) candidates.push(base);
  }
  if (Array.isArray(raw.synonyms)) {
    for (const s of raw.synonyms) {
      if (s) candidates.push(s.trim().toLowerCase());
    }
  }

  // Also include accent-stripped candidates (e.g. "büchner funnel" -> "buchner funnel")
  const expanded: string[] = [];
  for (const c of candidates) {
    expanded.push(c);
    const ascii = stripAccents(c);
    if (ascii !== c) expanded.push(ascii);
  }

  if (diagramMap) {
    for (const key of expanded) {
      const hit = diagramMap[key];
      if (hit) {
        return `./${hit.replace(/^\/+/, '')}`;
      }
    }
  }

  if (diagramLib) {
    for (const key of expanded) {
      if (key === 'animal cell' && diagramLib.animal?.image) {
        return `./${diagramLib.animal.image.replace(/^\/+/, '')}`;
      }
      if (key === 'plant cell' && diagramLib.plant?.image) {
        return `./${diagramLib.plant.image.replace(/^\/+/, '')}`;
      }
    }
  }
  return null;
}

class DictionaryService {
  private entries: DictionaryEntry[] = [];
  private diagramIndices: number[] = [];
  private diagramHubItems: DiagramHubItem[] = [];
  private counts: SubjectCounts = { ...DEFAULT_COUNTS };
  private worker: Worker | null = null;
  private workerReady = false;
  private readyPromise: Promise<void> | null = null;
  private reqCounter = 0;
  private pendingRequests = new Map<number, (payload: any) => void>();

  public async init(): Promise<{
    entries: DictionaryEntry[];
    counts: SubjectCounts;
    diagramCount: number;
  }> {
    if (this.readyPromise) {
      await this.readyPromise;
      return {
        entries: this.entries,
        counts: this.counts,
        diagramCount: this.diagramHubItems.length,
      };
    }

    this.readyPromise = this._bootstrap();
    await this.readyPromise;
    return {
      entries: this.entries,
      counts: this.counts,
      diagramCount: this.diagramHubItems.length,
    };
  }

  private async _bootstrap(): Promise<void> {
    // Load lightweight helpers in parallel with heavy dictionary dataset
    await Promise.all([
      loadScriptOnce('./core_dictionary.js'),
      loadScriptOnce('./core_dictionary_diagrams.js'),
      loadScriptOnce('./core_diagram_data.js'),
      loadScriptOnce('./core_formula_renderer.js'),
      loadScriptOnce('./core_distractor_engine.js'),
      loadScriptOnce('./core_voice_audio.js'),
    ]);

    const dictApi = window.STEMDictionary;
    if (!dictApi) {
      throw new Error('STEMDictionary failed to initialize.');
    }

    // Bridge getAllEntries if caller expects it
    if (!dictApi.getAllEntries) {
      dictApi.getAllEntries = dictApi.getAllWords;
    }

    const rawWords = dictApi.getAllWords();
    const diagramMap = window.DictionaryDiagrams || {};
    const diagramLib = window.DiagramLibrary || {};
    const entryIndexByWord = new Map<string, number>();

    this.entries = new Array(rawWords.length);
    this.diagramIndices = [];

    const workerItems: Array<{ w: string; r: string; s: string[]; d: string }> = new Array(rawWords.length);

    for (let i = 0; i < rawWords.length; i++) {
      const raw = rawWords[i];
      const word = (raw.word || '').trim();
      const rawHead = (raw.raw_headword || raw.raw || word).trim();
      const displayWord = rawHead.split('(')[0].trim() || word;
      const firstChar = word ? word[0].toUpperCase() : '#';
      const letter = firstChar >= 'A' && firstChar <= 'Z' ? firstChar : '#';
      const diagramPath = resolveDiagramForEntry(raw, diagramMap, diagramLib);

      if (diagramPath) {
        this.diagramIndices.push(i);
      }

      const wLower = word.toLowerCase();
      if (!entryIndexByWord.has(wLower)) {
        entryIndexByWord.set(wLower, i);
      }

      this.entries[i] = {
        idx: i,
        word,
        displayWord,
        rawHeadword: rawHead,
        synonyms: Array.isArray(raw.synonyms) ? raw.synonyms : [],
        definition: raw.definition || '',
        letter,
        subject: 'General STEM',
        diagramPath,
      };

      workerItems[i] = {
        w: word,
        r: rawHead,
        s: Array.isArray(raw.synonyms) ? raw.synonyms : [],
        d: raw.definition || '',
      };
    }

    // Build unique Diagram Hub items
    const uniqueDiagMap = new Map<string, DiagramHubItem>();
    for (const [term, path] of Object.entries(diagramMap)) {
      const normalized = `./${path.replace(/^\/+/, '')}`;
      const existing = uniqueDiagMap.get(normalized);
      if (existing) {
        existing.terms.push(term);
      } else {
        const matchedIdx = entryIndexByWord.get(term.toLowerCase()) ?? null;
        uniqueDiagMap.set(normalized, {
          primaryTerm: term,
          terms: [term],
          image: normalized,
          entryIdx: matchedIdx,
        });
      }
    }

    // Also include interactive schemas from DiagramLibrary (animal_cell.jpeg, plant_cell.jpeg)
    for (const schema of Object.values(diagramLib)) {
      if (!schema?.image) continue;
      const normalized = `./${schema.image.replace(/^\/+/, '')}`;
      if (!uniqueDiagMap.has(normalized)) {
        const keyTerm = schema.id === 'animal' ? 'animal cell' : schema.id === 'plant' ? 'plant cell' : schema.title;
        const matchedIdx = entryIndexByWord.get(keyTerm.toLowerCase()) ?? null;
        uniqueDiagMap.set(normalized, {
          primaryTerm: keyTerm,
          terms: [keyTerm, ...(schema.labels || [])],
          image: normalized,
          entryIdx: matchedIdx,
        });
      }
    }

    this.diagramHubItems = Array.from(uniqueDiagMap.values()).sort((a, b) =>
      a.primaryTerm.localeCompare(b.primaryTerm)
    );

    // Initialize Web Worker for Prefix Trie + Subject Classifier
    if (typeof Worker !== 'undefined') {
      await this._initWorker(workerItems);
    } else {
      this.counts = { ...DEFAULT_COUNTS, All: this.entries.length };
    }

    // Warm up VoiceManager and KaTeX in the background
    try {
      window.VoiceManager?.init();
      window.FormulaRenderer?.loadKaTeX();
    } catch {
      // ignore
    }
  }

  private _initWorker(items: Array<{ w: string; r: string; s: string[]; d: string }>): Promise<void> {
    return new Promise((resolve) => {
      try {
        this.worker = new Worker('./search_worker.js');
        this.worker.onmessage = (e: MessageEvent) => {
          const data = e.data;
          if (!data) return;

          if (data.type === 'READY') {
            this.counts = data.subjectCounts || { ...DEFAULT_COUNTS, All: this.entries.length };
            const subjectsByIdx: Array<Exclude<SubjectCategory, 'All'>> = data.subjectsByIdx || [];
            for (let i = 0; i < subjectsByIdx.length && i < this.entries.length; i++) {
              this.entries[i].subject = subjectsByIdx[i];
            }
            this.workerReady = true;
            resolve();
            return;
          }

          if (typeof data.id === 'number') {
            const cb = this.pendingRequests.get(data.id);
            if (cb) {
              this.pendingRequests.delete(data.id);
              cb(data);
            }
          }
        };

        this.worker.onerror = () => {
          this.workerReady = false;
          this.counts = { ...DEFAULT_COUNTS, All: this.entries.length };
          resolve();
        };

        this.worker.postMessage({ type: 'INIT', items });
      } catch {
        this.workerReady = false;
        this.counts = { ...DEFAULT_COUNTS, All: this.entries.length };
        resolve();
      }
    });
  }

  public getAllEntries(): DictionaryEntry[] {
    return this.entries;
  }

  public getCounts(): SubjectCounts {
    return this.counts;
  }

  public getDiagramHubItems(): DiagramHubItem[] {
    return this.diagramHubItems;
  }

  public getEntryByWord(word: string): DictionaryEntry | null {
    const target = word.trim().toLowerCase();
    for (let i = 0; i < this.entries.length; i++) {
      if (this.entries[i].word.toLowerCase() === target) {
        return this.entries[i];
      }
    }
    return null;
  }

  public getDiagramSchemaForImage(
    imagePath: string
  ): { title: string; labels: string[] } | null {
    const lib = window.DiagramLibrary;
    if (!lib || !imagePath) return null;
    const clean = imagePath.toLowerCase();
    if (clean.includes('animal_cell')) {
      return lib.animal ? { title: lib.animal.title, labels: lib.animal.labels || [] } : null;
    }
    if (clean.includes('plant_cell')) {
      return lib.plant ? { title: lib.plant.title, labels: lib.plant.labels || [] } : null;
    }
    return null;
  }

  public lookupBestMatch(
    rawQuery: string,
    subject: SubjectCategory = 'All'
  ): { entry: DictionaryEntry; isExact: boolean } | null {
    const q = rawQuery.trim().toLowerCase();
    if (!q) return null;

    const pool =
      subject === 'All'
        ? this.entries
        : this.entries.filter((e) => e.subject === subject);

    // 1. Exact word / rawHeadword / synonym match
    for (let i = 0; i < pool.length; i++) {
      const e = pool[i];
      if (
        e.word.toLowerCase() === q ||
        e.displayWord.toLowerCase() === q ||
        e.rawHeadword.toLowerCase() === q ||
        e.synonyms.some((s) => s.toLowerCase() === q)
      ) {
        return { entry: e, isExact: true };
      }
    }

    // 2. Word-boundary standalone match (e.g. "phone" -> "mobile phone")
    const escaped = q.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    const wordRx = new RegExp(`\\b${escaped}\\b`, 'i');
    const titleMatches: DictionaryEntry[] = [];
    const rawMatches: DictionaryEntry[] = [];
    const prefixMatches: DictionaryEntry[] = [];
    const containsMatches: DictionaryEntry[] = [];

    for (let i = 0; i < pool.length; i++) {
      const e = pool[i];
      const wLower = e.word.toLowerCase();
      const rawLower = e.rawHeadword.toLowerCase();
      if (wordRx.test(wLower)) {
        titleMatches.push(e);
      } else if (wordRx.test(rawLower)) {
        rawMatches.push(e);
      } else if (wLower.startsWith(q)) {
        prefixMatches.push(e);
      } else if (
        wLower.includes(q) ||
        rawLower.includes(q) ||
        e.synonyms.some((s) => s.toLowerCase().includes(q))
      ) {
        containsMatches.push(e);
      }
    }

    if (titleMatches.length > 0) {
      titleMatches.sort((a, b) => a.word.length - b.word.length);
      return { entry: titleMatches[0], isExact: false };
    }
    if (rawMatches.length > 0) {
      rawMatches.sort((a, b) => a.word.length - b.word.length);
      return { entry: rawMatches[0], isExact: false };
    }
    if (prefixMatches.length > 0) {
      prefixMatches.sort((a, b) => a.word.length - b.word.length);
      return { entry: prefixMatches[0], isExact: false };
    }
    if (containsMatches.length > 0) {
      containsMatches.sort((a, b) => a.word.length - b.word.length);
      return { entry: containsMatches[0], isExact: false };
    }
    return null;
  }

  public async autocomplete(
    query: string,
    subject: SubjectCategory = 'All',
    limit = 8
  ): Promise<DictionaryEntry[]> {
    const q = query.trim();
    if (!q) return [];

    if (this.worker && this.workerReady) {
      const id = ++this.reqCounter;
      const result = await new Promise<{ indices: number[] }>((resolve) => {
        this.pendingRequests.set(id, resolve);
        this.worker!.postMessage({
          type: 'AUTOCOMPLETE',
          id,
          query: q,
          subject,
          limit,
        });
      });
      return (result.indices || []).map((idx) => this.entries[idx]).filter(Boolean);
    }

    // Fallback synchronous scan
    const qLower = q.toLowerCase();
    const out: DictionaryEntry[] = [];
    for (let i = 0; i < this.entries.length && out.length < limit; i++) {
      const e = this.entries[i];
      if (subject !== 'All' && e.subject !== subject) continue;
      if (e.word.toLowerCase().startsWith(qLower)) out.push(e);
    }
    return out;
  }

  public async filterEntries(params: {
    query: string;
    subject: SubjectCategory;
    letter: string;
    diagramOnly?: boolean;
  }): Promise<number[]> {
    if (this.worker && this.workerReady) {
      const id = ++this.reqCounter;
      const result = await new Promise<{ indices: number[] }>((resolve) => {
        this.pendingRequests.set(id, resolve);
        this.worker!.postMessage({
          type: 'FILTER',
          id,
          query: params.query,
          subject: params.subject,
          letter: params.letter,
          diagramOnly: !!params.diagramOnly,
          diagramSet: params.diagramOnly ? this.diagramIndices : null,
        });
      });
      return result.indices || [];
    }

    const q = params.query.trim().toLowerCase();
    const out: number[] = [];
    for (let i = 0; i < this.entries.length; i++) {
      const e = this.entries[i];
      if (params.subject !== 'All' && e.subject !== params.subject) continue;
      if (params.letter !== 'ALL' && e.letter !== params.letter) continue;
      if (params.diagramOnly && !e.diagramPath) continue;
      if (q && !e.word.toLowerCase().includes(q)) continue;
      out.push(i);
    }
    return out;
  }
}

export const dictionaryService = new DictionaryService();

export function renderScienceIntoElement(element: HTMLElement | null, rawText: string): void {
  if (!element) return;
  element.setAttribute('data-raw-content', rawText);
  element.textContent = rawText;
  if (typeof window.renderScienceText === 'function') {
    window.renderScienceText(element);
  }
}

export function playSound(
  type: 'click' | 'chip' | 'success' | 'error' | 'warp' | 'gem' | 'levelup' | 'fanfare'
): void {
  try {
    window.AudioManager?.play(type);
  } catch {
    // ignore audio issues
  }
}

export function speakText(
  text: string,
  options?: { rate?: number; onend?: () => void; onerror?: () => void }
): void {
  try {
    if (!window.VoiceManager) return;
    window.VoiceManager.speak(text, {
      force: true,
      rate: options?.rate ?? 0.92,
      onend: options?.onend,
      onerror: options?.onerror,
    });
  } catch {
    // ignore speech errors
  }
}

export function stopSpeaking(): void {
  try {
    window.VoiceManager?.stop();
  } catch {
    // ignore
  }
}
