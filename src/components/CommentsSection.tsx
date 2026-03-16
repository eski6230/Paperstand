import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { MessageSquare, Send, Loader2, LogIn } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Comment } from '../types';

interface CommentsSectionProps {
  paperId: string;
  paperTitle: string;
  user: User | null;
  onRequestLogin: () => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

export default function CommentsSection({ paperId, paperTitle, user, onRequestLogin }: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadComments();

    // Realtime subscription
    const channel = supabase
      .channel(`comments:${paperId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'paper_comments', filter: `paper_id=eq.${paperId}` },
        () => loadComments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [paperId]);

  const loadComments = async () => {
    const { data, error } = await supabase
      .from('paper_comments')
      .select('*, profiles(display_name, avatar_url)')
      .eq('paper_id', paperId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setComments(data as Comment[]);
    }
    setIsLoading(false);
  };

  const handleSubmit = async () => {
    if (!user || !newComment.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('paper_comments').insert({
        user_id: user.id,
        paper_id: paperId,
        paper_title: paperTitle,
        content: newComment.trim(),
      });
      if (!error) setNewComment('');
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="border-t border-slate-100 dark:border-slate-800 pt-8">
      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4 flex items-center gap-2">
        <MessageSquare size={18} className="text-indigo-500" />
        댓글
        {comments.length > 0 && (
          <span className="text-xs font-normal text-slate-400 normal-case tracking-normal">({comments.length})</span>
        )}
      </h3>

      {/* Comment List */}
      <div className="space-y-4 mb-5">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 size={20} className="animate-spin text-slate-400" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">
            아직 댓글이 없습니다. 첫 번째 댓글을 남겨보세요.
          </p>
        ) : (
          comments.map((comment) => {
            const name = comment.profiles?.display_name || '익명';
            const avatar = comment.profiles?.avatar_url;
            return (
              <div key={comment.id} className="flex gap-3">
                {avatar ? (
                  <img src={avatar} alt={name} className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 text-xs font-bold shrink-0 mt-0.5">
                    {name[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{name}</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">{timeAgo(comment.created_at)}</span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed break-words">{comment.content}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Comment Input */}
      {user ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
            placeholder="댓글을 입력하세요..."
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500 dark:text-white disabled:opacity-50"
          />
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !newComment.trim()}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-xl transition-colors flex items-center justify-center"
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      ) : (
        <button
          onClick={onRequestLogin}
          className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-500 dark:text-slate-400 hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <LogIn size={16} />
          로그인 후 댓글 달기
        </button>
      )}
    </section>
  );
}
