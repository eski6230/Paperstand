import { useState } from 'react';
import { X, Share2, BookOpen, Loader2 } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Paper } from '../types';

interface ShareToCommunityModalProps {
  paper: Paper;
  user: User | null;
  onClose: () => void;
  onSubmit: () => void;
}

const MAX_LENGTH = 500;

export default function ShareToCommunityModal({ paper, user, onClose, onSubmit }: ShareToCommunityModalProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!user || !content.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const { error: insertError } = await supabase.from('community_posts').insert({
        user_id: user.id,
        paper_id: paper.id,
        paper_title: paper.title,
        paper_journal: paper.journal,
        paper_date: paper.date,
        paper_url: paper.url,
        content: content.trim(),
      });
      if (insertError) throw insertError;
      onSubmit();
      onClose();
    } catch (err) {
      console.error('Failed to share to community:', err);
      setError('게시에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-600 overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Share2 size={18} />
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">커뮤니티에 공유</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* 논문 정보 카드 */}
        <div className="mx-5 mt-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
          <div className="flex items-start gap-2">
            <BookOpen size={14} className="text-indigo-500 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100 line-clamp-2">{paper.title}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{paper.journal} · {paper.date}</p>
            </div>
          </div>
        </div>

        {/* 본문 입력 */}
        <div className="px-5 pt-4 pb-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, MAX_LENGTH))}
            placeholder="이 논문에 대한 의견이나 추천 이유를 공유해주세요..."
            rows={5}
            className="w-full resize-none rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-500 transition-colors"
          />
          <div className="flex items-center justify-between mt-1.5">
            {error && <p className="text-xs text-rose-500">{error}</p>}
            <span className={`text-xs ml-auto ${content.length >= MAX_LENGTH ? 'text-rose-500' : 'text-slate-400'}`}>
              {content.length}/{MAX_LENGTH}
            </span>
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                게시 중...
              </>
            ) : (
              <>
                <Share2 size={15} />
                커뮤니티에 게시
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
