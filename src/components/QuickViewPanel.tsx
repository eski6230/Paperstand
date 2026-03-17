import { Paper } from '../types';
import { X, ExternalLink, BookOpen, ChevronRight, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useEffect } from 'react';

interface QuickViewPanelProps {
  paper: Paper;
  onClose: () => void;
  onReadMore: () => void;
}

function extractHeadline(shortSummary: string): string {
  const lines = shortSummary.split(/\\n|\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return '';
  return lines[0].replace(/^[\d]+\.\s*|^[-•*]\s*/, '').trim();
}

function extractPreviewLines(shortSummary: string): string[] {
  const lines = shortSummary.split(/\\n|\n/).map(l => l.trim()).filter(Boolean);
  return lines.slice(1, 4).map(l => l.replace(/^[\d]+\.\s*|^[-•*]\s*/, '').trim());
}

export default function QuickViewPanel({ paper, onClose, onReadMore }: QuickViewPanelProps) {
  const headline = extractHeadline(paper.shortSummary || '');
  const previewLines = extractPreviewLines(paper.shortSummary || '');

  // ESC 키로 닫기
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // 스크롤 잠금
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Panel — 모바일: 하단 시트 / 데스크톱: 중앙 컴팩트 모달 */}
      <motion.div
        initial={{ opacity: 0, y: '100%' }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed bottom-0 inset-x-0 z-50 md:inset-auto md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg"
      >
        <div className="bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">

          {/* 드래그 핸들 (모바일) */}
          <div className="flex justify-center pt-3 pb-1 md:hidden">
            <div className="w-10 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
          </div>

          {/* Header row */}
          <div className="flex items-center justify-between px-5 pt-2 pb-3 md:pt-5">
            <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
              <span className="font-semibold text-indigo-500 dark:text-indigo-400">{paper.journal}</span>
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {paper.date}
              </span>
              <span className="flex items-center gap-1 text-amber-500 dark:text-amber-400 font-medium">
                · Quick read (10 sec)
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div className="px-5 pb-5 space-y-4">

            {/* Layer 1: 핵심 한 줄 요약 (최우선) */}
            {headline ? (
              <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-50 leading-snug">
                {headline}
              </p>
            ) : (
              <div className="h-6 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
            )}

            {/* 구분선 */}
            <div className="h-px bg-slate-100 dark:bg-slate-800" />

            {/* Layer 1 (secondary): 논문 제목 */}
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
              {paper.title}
            </p>

            {/* Layer 2: 2~3줄 미리보기 */}
            {previewLines.length > 0 && (
              <ul className="space-y-1.5">
                {previewLines.map((line, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    <span className="text-indigo-300 dark:text-indigo-500 shrink-0 mt-0.5 font-bold">·</span>
                    <span className="line-clamp-2">{line}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* CTA 버튼 */}
            <div className="flex gap-3 pt-1">
              {/* 자세히 읽기 → Full Modal */}
              <button
                onClick={onReadMore}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-sm font-semibold rounded-2xl transition-all shadow-sm shadow-indigo-200 dark:shadow-none"
              >
                <BookOpen size={16} />
                자세히 읽기
                <ChevronRight size={15} />
              </button>

              {/* 원문 보기 → PubMed */}
              <a
                href={paper.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="flex items-center justify-center gap-1.5 px-4 py-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium rounded-2xl transition-colors"
              >
                <ExternalLink size={15} />
                원문
              </a>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
