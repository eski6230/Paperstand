import { useState, useEffect } from 'react';
import { Paper } from '../types';
import { Clock, FileText, ThumbsUp, MessageCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';

interface VoteSummary {
  voteScore: number;
  commentCount: number;
}

interface PaperListProps {
  papers: Paper[];
  loading: boolean;
  isStreaming?: boolean;
  onSelectPaper: (paper: Paper) => void;
  onSelectKeyword: (keyword: string) => void;
  readPaperIds?: Set<string>;  // history에서 이미 읽은 논문 ID 세트
}

export default function PaperList({ papers, loading, isStreaming, onSelectPaper, onSelectKeyword, readPaperIds }: PaperListProps) {
  const [voteSummaries, setVoteSummaries] = useState<Record<string, VoteSummary>>({});

  // 카드 목록이 바뀔 때 투표수·댓글수 배치 조회
  useEffect(() => {
    if (papers.length === 0) return;
    const ids = papers.map(p => p.id);

    (async () => {
      const [voteRes, commentRes] = await Promise.all([
        supabase.from('paper_votes').select('paper_id, vote').in('paper_id', ids),
        supabase.from('paper_comments').select('paper_id').in('paper_id', ids),
      ]);

      const summaries: Record<string, VoteSummary> = {};
      ids.forEach(id => { summaries[id] = { voteScore: 0, commentCount: 0 }; });

      (voteRes.data || []).forEach(v => {
        if (summaries[v.paper_id]) summaries[v.paper_id].voteScore += v.vote;
      });
      (commentRes.data || []).forEach(c => {
        if (summaries[c.paper_id]) summaries[c.paper_id].commentCount += 1;
      });

      setVoteSummaries(summaries);
    })();
  }, [papers]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm animate-pulse">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-4"></div>
            <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-4"></div>
            <div className="flex gap-2 mb-6">
              <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-full w-20"></div>
              <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-full w-24"></div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-4/6"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (papers.length === 0 && !isStreaming) {
    return (
      <div className="text-center py-20">
        <FileText className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">No papers found</h3>
        <p className="text-slate-500 dark:text-slate-400">Try selecting a different category or keyword.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {papers.map((paper, index) => {
        const summary = voteSummaries[paper.id];
        const hasActivity = summary && (summary.voteScore !== 0 || summary.commentCount > 0);
        const isRead = readPaperIds?.has(paper.id) ?? false;

        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            key={paper.id}
            className={`rounded-2xl p-6 border shadow-sm hover:shadow-md transition-all cursor-pointer group ${
              isRead
                ? 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800/60 opacity-80 hover:opacity-100'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 dark:hover:border-slate-700'
            }`}
            onClick={() => onSelectPaper(paper)}
          >
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                {/* 메타 */}
                <div className="flex items-center gap-2 flex-wrap text-sm text-slate-500 dark:text-slate-400 mb-3">
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded">
                    {paper.journal}
                  </span>
                  <div className="flex items-center gap-1">
                    <Clock size={14} />
                    <span>{paper.date}</span>
                  </div>
                  {/* 읽음 뱃지 */}
                  {isRead && (
                    <span className="flex items-center gap-1 text-xs font-medium text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10 px-2 py-0.5 rounded-full">
                      <CheckCircle2 size={11} />
                      읽음
                    </span>
                  )}
                  {/* 커뮤니티 활동 뱃지 */}
                  {hasActivity && (
                    <div className="flex items-center gap-2 ml-auto">
                      {summary.voteScore !== 0 && (
                        <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                          summary.voteScore > 0
                            ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10'
                            : 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10'
                        }`}>
                          <ThumbsUp size={12} />
                          {summary.voteScore > 0 ? `+${summary.voteScore}` : summary.voteScore}
                        </span>
                      )}
                      {summary.commentCount > 0 && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                          <MessageCircle size={12} />
                          {summary.commentCount}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* 제목 */}
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors leading-tight">
                  {paper.title}
                </h3>

                {/* 키워드 */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {paper.keywords.map((kw) => (
                    <button
                      key={kw}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectKeyword(kw);
                      }}
                      className="text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2.5 py-1 rounded-full transition-colors"
                    >
                      {kw}
                    </button>
                  ))}
                </div>

                {/* 요약 */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                    Key Clinical Points
                  </h4>
                  <div className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed space-y-2">
                    {(paper.shortSummary || '').split(/\\n|\n/).filter(line => line.trim() !== '').map((line, i) => (
                      <p key={i} className="flex items-start gap-2">
                        <span className="text-indigo-400 font-bold shrink-0 mt-0.5">•</span>
                        <span>{line.replace(/^\d+\.\s*/, '')}</span>
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}

      {isStreaming && papers.length < 3 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm animate-pulse">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">AI가 다음 논문을 분석 중입니다...</span>
          </div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-4"></div>
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
          </div>
        </div>
      )}
    </div>
  );
}
