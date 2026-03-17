import { useState, useEffect, MutableRefObject } from 'react';
import { Paper, UserPreferences } from '../types';
import { fetchLitePapersForCategory } from '../services/gemini';
import PaperList from './PaperList';
import { motion } from 'motion/react';
import { ChevronRight, Shuffle, Sparkles } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const SECTION_LIMIT = 3;
const RANDOM_COUNT = 4;

const SPECIALTY_EMOJI: Record<string, string> = {
  'Cardiology':                         '🫀',
  'Neurology & Neurosurgery':           '🧠',
  'Oncology':                           '🎗️',
  'Gastrointestinology':                '🫁',
  'Hepatology':                         '🔬',
  'Nephrology':                         '💊',
  'Pulmonology & Critical care medicine': '🌬️',
  'Endocrinology':                      '⚗️',
  'Rheumatology':                       '🦴',
  'Infectious disease':                 '🦠',
  'Hematology':                         '🩸',
  'Allergy & Immunology':              '💉',
  'Medical AI':                         '🤖',
};

function getEmoji(specialty: string): string {
  return SPECIALTY_EMOJI[specialty] ?? '📋';
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface SectionData {
  papers: Paper[];
  loading: boolean;
  error: boolean;
}

interface HomeFeedProps {
  specialties: string[];
  preferences: UserPreferences;
  papersCache: MutableRefObject<Record<string, Paper[]>>;
  readPaperIds: Set<string>;
  onSelectPaper: (paper: Paper) => void;
  onSelectKeyword: (keyword: string) => void;
  onSeeMore: (specialty: string) => void;
  refreshTrigger?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HomeFeed({
  specialties,
  preferences,
  papersCache,
  readPaperIds,
  onSelectPaper,
  onSelectKeyword,
  onSeeMore,
  refreshTrigger = 0,
}: HomeFeedProps) {
  const [sections, setSections] = useState<Record<string, SectionData>>(() =>
    Object.fromEntries(specialties.map(s => [s, { papers: [], loading: true, error: false }]))
  );
  const [randomPicks, setRandomPicks] = useState<Paper[]>([]);
  const [randomSeed, setRandomSeed] = useState(0);

  // Recompute random picks whenever any section updates or user shuffles
  useEffect(() => {
    const pool: Paper[] = [];
    (Object.values(sections) as SectionData[]).forEach(s => {
      if (s.papers.length > 0) pool.push(...s.papers.slice(0, 2));
    });
    if (pool.length >= 3) {
      setRandomPicks(shuffle(pool).slice(0, RANDOM_COUNT));
    }
  }, [sections, randomSeed]);

  // Fetch all specialties in parallel
  useEffect(() => {
    setSections(Object.fromEntries(
      specialties.map(s => [s, { papers: [], loading: true, error: false }])
    ));
    setRandomPicks([]);

    const updateSection = (specialty: string, data: Partial<SectionData>) =>
      setSections(prev => ({ ...prev, [specialty]: { ...prev[specialty], ...data } }));

    specialties.forEach(async (specialty) => {
      const cacheKey = `${specialty}-all-suggestion`;

      // Serve from cache immediately
      if (papersCache.current[cacheKey]?.length > 0) {
        updateSection(specialty, { papers: papersCache.current[cacheKey], loading: false });
        return;
      }

      try {
        // Lite fetch: PubMed only, instant — no AI calls
        const papers = await fetchLitePapersForCategory(
          specialty,
          undefined,
          preferences,
          'suggestion',
          4,  // fetch 4, display up to SECTION_LIMIT=3
        );

        if (papers.length > 0) {
          papersCache.current[cacheKey] = papers;
          updateSection(specialty, { papers, loading: false, error: false });
        } else {
          updateSection(specialty, { loading: false, error: true });
        }
      } catch {
        updateSection(specialty, { loading: false, error: true });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specialties.join(','), refreshTrigger]);

  // ── Masthead date ────────────────────────────────────────────────────────────
  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });

  return (
    <div className="space-y-12">

      {/* ── Masthead ──────────────────────────────────────────────────────────── */}
      <div className="border-b-2 border-slate-900 dark:border-slate-100 pb-4">
        <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-slate-400 dark:text-slate-500 mb-2">
          {today}
        </p>
        <div className="flex items-end justify-between gap-4">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-slate-900 dark:text-slate-50 leading-none">
            오늘의 의학 리뷰
          </h1>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 text-right hidden sm:block leading-relaxed shrink-0">
            AI 큐레이션 · 내과 전문<br />PubMed 최신 논문
          </p>
        </div>
      </div>

      {/* ── Specialty sections ────────────────────────────────────────────────── */}
      {specialties.map((specialty, idx) => {
        const section = sections[specialty];
        if (!section) return null;
        const displayPapers = section.papers.slice(0, SECTION_LIMIT);

        return (
          <motion.section
            key={specialty}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.07, duration: 0.32 }}
          >
            {/* Section header */}
            <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="text-xl leading-none select-none">{getEmoji(specialty)}</span>
                <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-50">
                  {specialty}
                </h2>
                {section.loading && (
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin shrink-0" />
                )}
              </div>
              <button
                onClick={() => onSeeMore(specialty)}
                className="flex items-center gap-1 text-xs font-semibold text-indigo-500 dark:text-indigo-400
                           hover:text-indigo-700 dark:hover:text-indigo-200 transition-colors group
                           px-2 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
              >
                더 보기
                <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* Skeleton */}
            {section.loading && displayPapers.length === 0 ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div
                    key={i}
                    className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 animate-pulse"
                  >
                    <div className="flex gap-2 mb-3">
                      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full w-16" />
                      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full w-24" />
                    </div>
                    <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-4/5 mb-1.5" />
                    <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/5 mb-4" />
                    <div className="h-px bg-slate-100 dark:bg-slate-800 mb-3" />
                    <div className="h-3.5 bg-slate-100 dark:bg-slate-800 rounded w-5/6 mb-2" />
                    <div className="h-3.5 bg-slate-100 dark:bg-slate-800 rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : section.error ? (
              <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-xl p-4 text-sm text-rose-600 dark:text-rose-400 text-center">
                논문을 불러오지 못했습니다
              </div>
            ) : displayPapers.length > 0 ? (
              <PaperList
                papers={displayPapers}
                loading={false}
                isStreaming={false}
                onSelectPaper={onSelectPaper}
                onSelectKeyword={onSelectKeyword}
                readPaperIds={readPaperIds}
              />
            ) : null}
          </motion.section>
        );
      })}

      {/* ── Random Picks ──────────────────────────────────────────────────────── */}
      {randomPicks.length >= 3 && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: specialties.length * 0.07 + 0.15, duration: 0.32 }}
        >
          <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-amber-200 dark:border-amber-500/30">
            <div className="flex items-center gap-2.5">
              <Sparkles size={18} className="text-amber-500 shrink-0" />
              <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-50">
                Random Picks
              </h2>
            </div>
            <button
              onClick={() => setRandomSeed(s => s + 1)}
              className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400
                         hover:text-amber-800 dark:hover:text-amber-200 transition-colors group
                         px-2 py-1 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-500/10"
            >
              <Shuffle size={13} className="group-hover:rotate-180 transition-transform duration-300" />
              섞기
            </button>
          </div>

          <PaperList
            papers={randomPicks}
            loading={false}
            isStreaming={false}
            onSelectPaper={onSelectPaper}
            onSelectKeyword={onSelectKeyword}
            readPaperIds={readPaperIds}
          />
        </motion.section>
      )}
    </div>
  );
}
