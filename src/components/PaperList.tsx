import { useState, useEffect } from 'react';
import { Paper } from '../types';
import { Clock, FileText, ThumbsUp, CheckCircle2, Zap, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';

interface VoteSummary {
  voteScore: number;
}

interface PaperListProps {
  papers: Paper[];
  loading: boolean;
  isStreaming?: boolean;
  onSelectPaper: (paper: Paper) => void;
  onSelectKeyword: (keyword: string) => void;
  readPaperIds?: Set<string>;
}

/** shortSummary 첫 줄 → 헤드라인. 없으면 abstract 첫 문장 fallback. */
function extractHeadline(shortSummary: string, abstract?: string): string {
  if (shortSummary) {
    const lines = shortSummary.split(/\\n|\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length > 0) return lines[0].replace(/^[\d]+\.\s*|^[-•*]\s*/, '').trim();
  }
  if (abstract) {
    const clean = abstract.replace(/^(BACKGROUND|OBJECTIVE|AIMS?|PURPOSE|INTRODUCTION|CONTEXT)[:\s]*/i, '').trim();
    const first = clean.split(/(?<=[.!?])\s+/)[0] || clean;
    return first.length > 130 ? first.slice(0, 130) + '…' : first;
  }
  return '';
}

/** shortSummary 2~4줄 → 미리보기. 없으면 abstract 앞부분 fallback. */
function extractPreview(shortSummary: string, abstract?: string): string {
  if (shortSummary) {
    const lines = shortSummary.split(/\\n|\n/).map(l => l.trim()).filter(Boolean);
    return lines.slice(1, 4).map(l => l.replace(/^[\d]+\.\s*|^[-•*]\s*/, '').trim()).join('  ·  ');
  }
  if (abstract) {
    const t = abstract.slice(0, 220);
    return t.length < abstract.length ? t + '…' : t;
  }
  return '';
}

/** 논문이 최근 60일 이내인지 */
function isNewPaper(dateStr: string): boolean {
  try {
    const parts = dateStr.split(' ');
    const year = parseInt(parts[parts.length - 1]);
    const monthMap: Record<string, number> = {
      Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,
      Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11,
    };
    const month = monthMap[parts[0]] ?? 0;
    const paperDate = new Date(year, month, 1);
    const diffDays = (Date.now() - paperDate.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 60;
  } catch {
    return false;
  }
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function PaperCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full w-16" />
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full w-24" />
      </div>
      <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-11/12 mb-1.5" />
      <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-4" />
      <div className="h-px bg-slate-100 dark:bg-slate-800 mb-3" />
      <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded w-5/6 mb-2" />
      <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded w-4/6 mb-2" />
      <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
    </div>
  );
}

// ─── Paper Card ───────────────────────────────────────────────────────────────

interface PaperCardProps {
  paper: Paper;
  index: number;
  summary?: VoteSummary;
  isRead: boolean;
  onSelectPaper: (paper: Paper) => void;
  onSelectKeyword: (keyword: string) => void;
}

function PaperCard({ paper, index, summary, isRead, onSelectPaper, onSelectKeyword }: PaperCardProps) {
  const isLite = !paper.shortSummary;                         // no AI summary yet
  const headline = extractHeadline(paper.shortSummary || '', paper.abstract);
  const preview  = extractPreview(paper.shortSummary || '', paper.abstract);
  const isNew = isNewPaper(paper.date);
  const isPopular = (summary?.voteScore ?? 0) >= 3;
  const hasActivity = summary && summary.voteScore !== 0;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      onClick={() => onSelectPaper(paper)}
      className={`group relative rounded-2xl border shadow-sm cursor-pointer
        hover:shadow-md hover:scale-[1.01] transition-all duration-200
        ${isRead
          ? 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/60 opacity-80 hover:opacity-100'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 dark:hover:border-slate-700'
        }`}
    >
      <div className="p-5">

        {/* ── Row 1: 메타 (최소화) ──────────────────────────── */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {/* 뱃지들 */}
          {isNew && !isRead && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 px-1.5 py-0.5 rounded-full uppercase">
              <Zap size={9} /> New
            </span>
          )}
          {isPopular && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wider text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-1.5 py-0.5 rounded-full uppercase">
              <TrendingUp size={9} /> Popular
            </span>
          )}
          {isRead && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10 px-1.5 py-0.5 rounded-full">
              <CheckCircle2 size={9} /> 읽음
            </span>
          )}

          {/* 저널 + 날짜 (우측 밀기) */}
          <div className="ml-auto flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
            <span className="font-medium text-indigo-500 dark:text-indigo-400">{paper.journal}</span>
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {paper.date}
            </span>
          </div>
        </div>

        {/* ── Row 2: 핵심 한 줄 요약 (Layer 1 - 최우선) ─────── */}
        {headline && (
          <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-50 leading-snug mb-1 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
            {headline}
          </p>
        )}

        {/* 라벨: AI 요약 있으면 "30 sec read", 없으면 "탭하여 AI 요약 보기" */}
        <span className={`inline-block text-[10px] font-semibold tracking-wider uppercase mb-3 ${
          isLite
            ? 'text-indigo-400 dark:text-indigo-500'
            : 'text-slate-400 dark:text-slate-500'
        }`}>
          {isLite ? '탭하여 AI 요약 보기 ✦' : '30 sec read'}
        </span>

        {/* ── 구분선 ──────────────────────────────────────────── */}
        <div className="h-px bg-slate-100 dark:bg-slate-800 mb-3" />

        {/* ── Row 3: 논문 제목 (Layer 1 - 이차) ──────────────── */}
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-snug mb-3 line-clamp-2">
          {paper.title}
        </h3>

        {/* ── Row 4: 미리보기 요약 (Layer 2) ─────────────────── */}
        {preview && (
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3 mb-4">
            {preview}
          </p>
        )}

        {/* ── Row 5: 키워드 + 활동 지표 ──────────────────────── */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* 키워드 (최대 3개) */}
          {paper.keywords.slice(0, 3).map(kw => (
            <button
              key={kw}
              onClick={e => { e.stopPropagation(); onSelectKeyword(kw); }}
              className="text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2 py-0.5 rounded-full transition-colors"
            >
              {kw}
            </button>
          ))}
          {paper.keywords.length > 3 && (
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              +{paper.keywords.length - 3}
            </span>
          )}

          {/* 투표 지표 (우측) */}
          {hasActivity && (
            <div className="ml-auto flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                summary!.voteScore > 0
                  ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10'
                  : 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10'
              }`}>
                <ThumbsUp size={11} />
                {summary!.voteScore > 0 ? `+${summary!.voteScore}` : summary!.voteScore}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.article>
  );
}

// ─── PaperList ────────────────────────────────────────────────────────────────

export default function PaperList({
  papers,
  loading,
  isStreaming,
  onSelectPaper,
  onSelectKeyword,
  readPaperIds,
}: PaperListProps) {
  const [voteSummaries, setVoteSummaries] = useState<Record<string, VoteSummary>>({});

  useEffect(() => {
    if (papers.length === 0) return;
    const ids = papers.map(p => p.id);

    (async () => {
      const voteRes = await supabase.from('paper_votes').select('paper_id, vote').in('paper_id', ids);

      const summaries: Record<string, VoteSummary> = {};
      ids.forEach(id => { summaries[id] = { voteScore: 0 }; });

      (voteRes.data || []).forEach(v => {
        if (summaries[v.paper_id]) summaries[v.paper_id].voteScore += v.vote;
      });

      setVoteSummaries(summaries);
    })();
  }, [papers]);

  // ── Loading state ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <PaperCardSkeleton key={i} />)}
      </div>
    );
  }

  // ── Empty state ────────────────────────────────────────────
  if (papers.length === 0 && !isStreaming) {
    return (
      <div className="text-center py-20">
        <FileText className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">No papers found</h3>
        <p className="text-slate-500 dark:text-slate-400">Try selecting a different category or keyword.</p>
      </div>
    );
  }

  // ── Paper list ─────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {papers.map((paper, index) => (
        <PaperCard
          key={paper.id}
          paper={paper}
          index={index}
          summary={voteSummaries[paper.id]}
          isRead={readPaperIds?.has(paper.id) ?? false}
          onSelectPaper={onSelectPaper}
          onSelectKeyword={onSelectKeyword}
        />
      ))}

      {/* Streaming 중 다음 카드 로딩 표시 */}
      {isStreaming && papers.length < 3 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              AI가 다음 논문을 분석 중입니다...
            </span>
          </div>
          <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-10/12 mb-2 animate-pulse" />
          <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-7/12 animate-pulse" />
        </div>
      )}
    </div>
  );
}
