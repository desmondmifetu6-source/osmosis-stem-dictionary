import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Award,
  Bookmark,
  CheckCircle2,
  Play,
  RotateCcw,
  X,
  XCircle,
} from 'lucide-react';
import { DictionaryEntry, QuizQuestion, SUBJECT_FILTERS, SubjectCategory } from '../types';
import { buildQuizQuestion, buildSubjectBlitzQuestions } from '../engine/quizEngine';
import { playSound } from '../engine/dictionaryService';
import { recordQuizResult } from '../engine/storage';
import { ScienceText } from './ScienceText';

interface QuizModalProps {
  isOpen: boolean;
  mode: 'single' | 'blitz';
  initialEntry: DictionaryEntry | null;
  initialSubject: SubjectCategory;
  allEntries: DictionaryEntry[];
  bookmarkedWords: Set<string>;
  onToggleBookmark: (entry: DictionaryEntry) => void;
  onClose: () => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

export const QuizModal: React.FC<QuizModalProps> = ({
  isOpen,
  mode,
  initialEntry,
  initialSubject,
  allEntries,
  bookmarkedWords,
  onToggleBookmark,
  onClose,
}) => {
  const [selectedSubject, setSelectedSubject] = useState<SubjectCategory>(initialSubject);
  const [phase, setPhase] = useState<'setup' | 'playing' | 'summary'>('playing');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [results, setResults] = useState<Array<{ question: QuizQuestion; isCorrect: boolean; chosen: string }>>([]);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedSubject(initialSubject);
    setSelectedOption(null);
    setCurrentIdx(0);
    setResults([]);

    if (mode === 'single' && initialEntry) {
      setQuestions([buildQuizQuestion(initialEntry, allEntries)]);
      setPhase('playing');
    } else if (mode === 'blitz') {
      setPhase('setup');
      setQuestions([]);
    }
  }, [isOpen, mode, initialEntry, initialSubject, allEntries]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const startBlitz = (subj: SubjectCategory) => {
    playSound('click');
    const qs = buildSubjectBlitzQuestions(subj, allEntries, 5);
    setQuestions(qs);
    setCurrentIdx(0);
    setSelectedOption(null);
    setResults([]);
    setPhase('playing');
  };

  const currentQuestion = questions[currentIdx];

  const handleChooseOption = (option: string) => {
    if (selectedOption !== null || !currentQuestion) return;
    const isCorrect = option === currentQuestion.correctAnswer;
    setSelectedOption(option);

    if (isCorrect) {
      playSound('success');
    } else {
      playSound('error');
    }

    const nextResults = [...results, { question: currentQuestion, isCorrect, chosen: option }];
    setResults(nextResults);

    if (mode === 'single') {
      recordQuizResult(isCorrect ? 1 : 0, 1, false);
    }
  };

  const handleNext = () => {
    playSound('click');
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx((i) => i + 1);
      setSelectedOption(null);
    } else {
      const correctTotal = results.filter((r) => r.isCorrect).length;
      if (mode === 'blitz') {
        recordQuizResult(correctTotal, questions.length, true);
        if (correctTotal >= 4) playSound('levelup');
      }
      setPhase('summary');
    }
  };

  const correctCount = results.filter((r) => r.isCorrect).length;
  const missedEntries = results.filter((r) => !r.isCorrect).map((r) => r.question.entry);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-md sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quiz-modal-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border-2 border-white/60 bg-white/95 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-slate-300 sm:hidden" aria-hidden="true" />
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="min-w-0 pr-2">
            <h2 id="quiz-modal-title" className="font-serif-dict text-lg sm:text-xl font-bold text-[#4F46E5]">
              {mode === 'single' ? 'Recall Challenge' : '5-Word Subject Blitz'}
            </h2>
            {phase === 'playing' && currentQuestion && (
              <p className="truncate text-xs font-semibold text-slate-500 tabular-nums">
                {mode === 'blitz'
                  ? `Question ${currentIdx + 1} of ${questions.length} · ${selectedSubject}`
                  : `${currentQuestion.entry.subject} · Distractor Engine MCQ`}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
            aria-label="Close quiz modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto overscroll-contain p-4 pb-safe sm:p-6">
          {phase === 'setup' && (
            <div className="space-y-4 sm:space-y-5">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900">
                  Choose a Curriculum Subject
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Test your exam readiness with 5 rapid-fire STEM definitions matched with morphological distractors.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5">
                {SUBJECT_FILTERS.map((subj) => {
                  const active = selectedSubject === subj;
                  return (
                    <button
                      key={subj}
                      type="button"
                      onClick={() => {
                        playSound('chip');
                        setSelectedSubject(subj);
                      }}
                      className={`min-h-[48px] rounded-xl border-2 px-3 py-2.5 text-left text-xs sm:text-sm font-bold leading-snug transition-colors ${
                        active
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {subj === 'All' ? 'All Subjects' : subj}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => startBlitz(selectedSubject)}
                className="osmosis-btn-gold inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-xs sm:text-sm font-extrabold uppercase tracking-wide"
              >
                <Play className="h-4 w-4 shrink-0 fill-current" />
                <span>Start 5-Word Quiz ({selectedSubject === 'All' ? 'Mixed STEM' : selectedSubject})</span>
              </button>
            </div>
          )}

          {phase === 'playing' && currentQuestion && (
            <div className="space-y-4 sm:space-y-5">
              {mode === 'blitz' && (
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-indigo-600 transition-all duration-200"
                    style={{ width: `${((currentIdx + (selectedOption ? 1 : 0)) / questions.length) * 100}%` }}
                  />
                </div>
              )}

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                  Which term matches this definition?
                </p>
                <div className="mt-2 rounded-2xl border border-indigo-600/20 bg-indigo-50/40 p-3.5 text-[14.5px] sm:p-4 sm:text-[15px] leading-relaxed text-slate-800">
                  <ScienceText text={currentQuestion.promptDefinition} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-2.5" role="radiogroup" aria-label="Answer choices">
                {currentQuestion.options.map((opt, idx) => {
                  const isAnswered = selectedOption !== null;
                  const isThisSelected = selectedOption === opt;
                  const isCorrectOpt = opt === currentQuestion.correctAnswer;

                  let stateClasses =
                    'border-slate-200 bg-white text-slate-900 hover:border-indigo-600/50 hover:bg-indigo-50/50';
                  if (isAnswered) {
                    if (isCorrectOpt) {
                      stateClasses = 'border-emerald-600 bg-emerald-50 text-emerald-950';
                    } else if (isThisSelected && !isCorrectOpt) {
                      stateClasses = 'border-rose-600 bg-rose-50 text-rose-950';
                    } else {
                      stateClasses = 'border-slate-200 bg-slate-50 text-slate-400 opacity-75';
                    }
                  }

                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={isAnswered}
                      onClick={() => handleChooseOption(opt)}
                      className={`flex min-h-[52px] items-center justify-between gap-2.5 rounded-xl border-2 px-3.5 py-3 text-left text-sm font-bold leading-snug transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${stateClasses}`}
                    >
                      <span className="flex items-start gap-2.5 min-w-0">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-100 text-xs font-extrabold text-indigo-800">
                          {OPTION_LETTERS[idx]}
                        </span>
                        <span className="whitespace-normal break-words">{opt}</span>
                      </span>

                      {isAnswered && isCorrectOpt && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 shrink-0">
                          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                          <span className="hidden sm:inline">Correct</span>
                        </span>
                      )}
                      {isAnswered && isThisSelected && !isCorrectOpt && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 shrink-0">
                          <XCircle className="h-4 w-4" aria-hidden="true" />
                          <span className="hidden sm:inline">Incorrect</span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {selectedOption !== null && (
                <div
                  className={`rounded-2xl border p-3.5 sm:p-4 ${
                    selectedOption === currentQuestion.correctAnswer
                      ? 'border-emerald-600/35 bg-emerald-50/75'
                      : 'border-amber-500/35 bg-amber-50/75'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {selectedOption === currentQuestion.correctAnswer ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
                          <span className="text-sm font-bold text-emerald-900 break-words">
                            Correct — {currentQuestion.correctAnswer}
                          </span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 shrink-0 text-rose-600" />
                          <span className="text-sm font-bold text-slate-900 break-words">
                            Incorrect — Answer: {currentQuestion.correctAnswer}
                          </span>
                        </>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggleBookmark(currentQuestion.entry)}
                      className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Bookmark
                        className={`h-3.5 w-3.5 ${
                          bookmarkedWords.has(currentQuestion.entry.word.toLowerCase())
                            ? 'fill-amber-500 text-amber-600'
                            : 'text-slate-500'
                        }`}
                      />
                      <span>
                        {bookmarkedWords.has(currentQuestion.entry.word.toLowerCase()) ? 'Saved' : 'Save Term'}
                      </span>
                    </button>
                  </div>

                  <div className="mt-2 text-sm leading-relaxed text-slate-700">
                    <ScienceText text={currentQuestion.explanation} />
                  </div>

                  <div className="mt-4 flex justify-end gap-2">
                    {mode === 'single' ? (
                      <button
                        type="button"
                        onClick={onClose}
                        className="osmosis-btn-indigo inline-flex min-h-[46px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-wide"
                      >
                        <span>Done</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleNext}
                        className="osmosis-btn-indigo inline-flex min-h-[46px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-wide"
                      >
                        <span>{currentIdx + 1 < questions.length ? 'Next Question' : 'View Results'}</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {phase === 'summary' && (
            <div className="space-y-4 sm:space-y-5">
              <div className="flex items-center gap-3.5 rounded-2xl border border-indigo-600/25 bg-indigo-50/80 p-4 sm:p-5">
                <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
                  <Award className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-800">
                    Subject Blitz Complete · {selectedSubject}
                  </p>
                  <p className="font-display text-xl sm:text-2xl font-extrabold tabular-nums text-slate-900">
                    {correctCount} / {questions.length} Correct ({Math.round((correctCount / Math.max(1, questions.length)) * 100)}%)
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {results.map((r, i) => {
                  const saved = bookmarkedWords.has(r.question.entry.word.toLowerCase());
                  return (
                    <div
                      key={`${r.question.entry.word}-${i}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3.5 py-2.5 sm:px-4 sm:py-3"
                    >
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        {r.isCorrect ? (
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                        ) : (
                          <XCircle className="h-5 w-5 shrink-0 text-rose-600" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">
                            {r.question.correctAnswer}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {r.isCorrect ? 'Mastered in blitz' : `Selected: ${r.chosen}`}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onToggleBookmark(r.question.entry)}
                        className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shrink-0"
                      >
                        <Bookmark className={`h-3.5 w-3.5 ${saved ? 'fill-amber-500 text-amber-600' : ''}`} />
                        <span>{saved ? 'Saved' : 'Revise'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col gap-2.5 sm:flex-row">
                {missedEntries.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      missedEntries.forEach((e) => {
                        if (!bookmarkedWords.has(e.word.toLowerCase())) {
                          onToggleBookmark(e);
                        }
                      });
                    }}
                    className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-900 hover:bg-amber-100"
                  >
                    <Bookmark className="h-4 w-4" />
                    <span>Bookmark Missed ({missedEntries.length})</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => startBlitz(selectedSubject)}
                  className="osmosis-btn-gold inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-extrabold uppercase tracking-wide"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Play Blitz Again</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
