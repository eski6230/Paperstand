import { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import {
  ThumbsUp, ThumbsDown, MessageCircle, ChevronDown, ChevronUp,
  ExternalLink, Loader2, TrendingUp, Clock, Share2,
  Twitter, Facebook
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { CommunityPost, CommunityPostComment } from '../types';

interface CommunityTabProps {
  user: User | null;
  onRequestLogin: () => void;
}

type SortMode = 'hot' | 'new';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}일 전`;
  return new Date(dateStr).toLocaleDateString('ko-KR');
}

// Reddit 아이콘 (lucide에 없어서 SVG 직접)
function RedditIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
    </svg>
  );
}

// 게시물 댓글 섹션 컴포넌트
function PostComments({ postId, user, onRequestLogin }: { postId: string; user: User | null; onRequestLogin: () => void }) {
  const [comments, setComments] = useState<CommunityPostComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadComments = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('community_post_comments')
      .select('*, profiles(display_name, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    setComments((data as CommunityPostComment[]) ?? []);
    setIsLoading(false);
  }, [postId]);

  useEffect(() => {
    loadComments();
    const channel = supabase
      .channel(`post_comments:${postId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_post_comments', filter: `post_id=eq.${postId}` }, loadComments)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [postId, loadComments]);

  const handleSubmit = async () => {
    if (!user || !newComment.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await supabase.from('community_post_comments').insert({
        user_id: user.id,
        post_id: postId,
        content: newComment.trim(),
      });
      setNewComment('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="border-t border-slate-100 dark:border-slate-700 pt-3 mt-3">
      {isLoading ? (
        <div className="flex justify-center py-3">
          <Loader2 size={16} className="animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              {c.profiles?.avatar_url ? (
                <img src={c.profiles.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
                  {(c.profiles?.display_name ?? '?')[0].toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{c.profiles?.display_name ?? '익명'}</span>
                  <span className="text-xs text-slate-400">{timeAgo(c.created_at)}</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 댓글 입력 */}
      {user ? (
        <div className="flex gap-2 mt-3">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="댓글을 입력하세요..."
            className="flex-1 text-sm px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors"
          />
          <button
            onClick={handleSubmit}
            disabled={!newComment.trim() || isSubmitting}
            className="px-3 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition-colors"
          >
            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : '게시'}
          </button>
        </div>
      ) : (
        <button onClick={onRequestLogin} className="mt-3 w-full text-xs text-center text-indigo-500 hover:text-indigo-600 py-2 border border-dashed border-indigo-300 dark:border-indigo-700 rounded-lg transition-colors">
          로그인 후 댓글을 작성할 수 있습니다
        </button>
      )}
    </div>
  );
}

// 게시물 카드 컴포넌트
function PostCard({ post, user, onRequestLogin, onVote }: {
  post: CommunityPost;
  user: User | null;
  onRequestLogin: () => void;
  onVote: (postId: string, diff: number, newVote: 1 | -1 | null) => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [isVoting, setIsVoting] = useState(false);

  const handleVote = async (direction: 1 | -1) => {
    if (!user || isVoting) return;
    setIsVoting(true);
    try {
      const isSame = post.user_vote === direction;
      if (isSame) {
        await supabase.from('community_post_votes').delete().eq('user_id', user.id).eq('post_id', post.id);
        onVote(post.id, -direction, null);
      } else {
        await supabase.from('community_post_votes').upsert(
          { user_id: user.id, post_id: post.id, vote: direction },
          { onConflict: 'user_id,post_id' }
        );
        const diff = post.user_vote ? direction - post.user_vote : direction;
        onVote(post.id, diff, direction);
      }
    } finally {
      setIsVoting(false);
    }
  };

  const shareToTwitter = () => {
    const text = `${post.paper_title}\n\n${post.content}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(post.paper_url ?? '')}`, '_blank');
  };
  const shareToReddit = () => {
    window.open(`https://reddit.com/submit?url=${encodeURIComponent(post.paper_url ?? '')}&title=${encodeURIComponent(post.paper_title)}`, '_blank');
  };
  const shareToFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(post.paper_url ?? '')}`, '_blank');
  };

  const voteScore = post.vote_score ?? 0;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm hover:shadow-md transition-shadow">
      {/* 논문 정보 */}
      <a
        href={post.paper_url ?? '#'}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-start gap-2 mb-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors line-clamp-2">{post.paper_title}</p>
          {(post.paper_journal || post.paper_date) && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{[post.paper_journal, post.paper_date].filter(Boolean).join(' · ')}</p>
          )}
        </div>
        <ExternalLink size={14} className="text-slate-400 shrink-0 mt-0.5" />
      </a>

      {/* 작성자 */}
      <div className="flex items-center gap-2 mb-2">
        {post.profiles?.avatar_url ? (
          <img src={post.profiles.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover ring-2 ring-indigo-400/30" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold ring-2 ring-indigo-400/30">
            {(post.profiles?.display_name ?? '?')[0].toUpperCase()}
          </div>
        )}
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{post.profiles?.display_name ?? '익명'}</span>
        <span className="text-xs text-slate-400 ml-auto">{timeAgo(post.created_at)}</span>
      </div>

      {/* 게시물 내용 */}
      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-3">{post.content}</p>

      {/* 액션 바 */}
      <div className="flex items-center gap-1 flex-wrap">
        {/* 투표 */}
        <div className="flex items-center bg-slate-50 dark:bg-slate-700/50 rounded-xl p-1 border border-slate-100 dark:border-slate-600">
          <button
            onClick={() => user ? handleVote(1) : onRequestLogin()}
            disabled={isVoting}
            title={user ? '추천' : '로그인 후 투표 가능'}
            className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
              post.user_vote === 1
                ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/20'
                : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
            }`}
          >
            <ThumbsUp size={15} />
          </button>
          <span className={`text-sm font-semibold min-w-[1.5rem] text-center ${
            voteScore > 0 ? 'text-emerald-600 dark:text-emerald-400' :
            voteScore < 0 ? 'text-rose-600 dark:text-rose-400' :
            'text-slate-500 dark:text-slate-400'
          }`}>
            {voteScore > 0 ? `+${voteScore}` : voteScore}
          </span>
          <button
            onClick={() => user ? handleVote(-1) : onRequestLogin()}
            disabled={isVoting}
            title={user ? '비추천' : '로그인 후 투표 가능'}
            className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
              post.user_vote === -1
                ? 'text-rose-600 bg-rose-50 dark:bg-rose-500/20'
                : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10'
            }`}
          >
            <ThumbsDown size={15} />
          </button>
        </div>

        {/* 댓글 버튼 */}
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-colors"
        >
          <MessageCircle size={15} />
          <span>{post.comment_count ?? 0}</span>
          {showComments ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {/* 외부 공유 */}
        <div className="flex items-center gap-1 ml-auto">
          <button onClick={shareToTwitter} title="X(Twitter)에 공유" className="p-1.5 text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-500/10 rounded-lg transition-colors">
            <Twitter size={14} />
          </button>
          <button onClick={shareToReddit} title="Reddit에 공유" className="p-1.5 text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 rounded-lg transition-colors">
            <RedditIcon size={14} />
          </button>
          <button onClick={shareToFacebook} title="Facebook에 공유" className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors">
            <Facebook size={14} />
          </button>
        </div>
      </div>

      {/* 댓글 섹션 */}
      {showComments && (
        <PostComments postId={post.id} user={user} onRequestLogin={onRequestLogin} />
      )}
    </div>
  );
}

export default function CommunityTab({ user, onRequestLogin }: CommunityTabProps) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>('hot');

  const loadPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      // 게시물 + 프로필 조인
      const { data: rawPosts } = await supabase
        .from('community_posts')
        .select('*, profiles(display_name, avatar_url)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!rawPosts || rawPosts.length === 0) {
        setPosts([]);
        setIsLoading(false);
        return;
      }

      const postIds = rawPosts.map((p: CommunityPost) => p.id);

      // 투표 합계 집계
      const { data: votesData } = await supabase
        .from('community_post_votes')
        .select('post_id, vote')
        .in('post_id', postIds);

      // 댓글 수 집계
      const { data: commentsData } = await supabase
        .from('community_post_comments')
        .select('post_id')
        .in('post_id', postIds);

      // 내 투표
      let myVotes: Record<string, 1 | -1> = {};
      if (user) {
        const { data: myVoteData } = await supabase
          .from('community_post_votes')
          .select('post_id, vote')
          .in('post_id', postIds)
          .eq('user_id', user.id);
        myVotes = Object.fromEntries((myVoteData ?? []).map((v: { post_id: string; vote: 1 | -1 }) => [v.post_id, v.vote]));
      }

      // 합산
      const voteMap: Record<string, number> = {};
      for (const v of (votesData ?? [])) {
        voteMap[v.post_id] = (voteMap[v.post_id] ?? 0) + v.vote;
      }
      const commentMap: Record<string, number> = {};
      for (const c of (commentsData ?? [])) {
        commentMap[c.post_id] = (commentMap[c.post_id] ?? 0) + 1;
      }

      let enriched: CommunityPost[] = rawPosts.map((p: CommunityPost) => ({
        ...p,
        vote_score: voteMap[p.id] ?? 0,
        user_vote: myVotes[p.id] ?? null,
        comment_count: commentMap[p.id] ?? 0,
      }));

      // 정렬
      if (sortMode === 'hot') {
        enriched = enriched.sort((a, b) => (b.vote_score ?? 0) - (a.vote_score ?? 0));
      }
      // 'new'는 이미 created_at 내림차순

      setPosts(enriched);
    } finally {
      setIsLoading(false);
    }
  }, [sortMode, user]);

  useEffect(() => {
    loadPosts();
    const channel = supabase
      .channel('community_posts_global')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_posts' }, loadPosts)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadPosts]);

  const handleVoteUpdate = (postId: string, diff: number, newVote: 1 | -1 | null) => {
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, vote_score: (p.vote_score ?? 0) + diff, user_vote: newVote }
        : p
    ));
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* 정렬 토글 */}
      <div className="flex items-center gap-2 mb-5">
        <button
          onClick={() => setSortMode('hot')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            sortMode === 'hot'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <TrendingUp size={14} />
          추천순
        </button>
        <button
          onClick={() => setSortMode('new')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            sortMode === 'new'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Clock size={14} />
          최신순
        </button>
        <span className="text-xs text-slate-400 ml-auto">전체 {posts.length}개</span>
      </div>

      {/* 게시물 목록 */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 size={28} className="animate-spin text-indigo-400" />
          <p className="text-sm text-slate-500">커뮤니티 글을 불러오는 중...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
          <Share2 size={36} strokeWidth={1.5} />
          <p className="text-base font-medium text-slate-500 dark:text-slate-400">아직 게시물이 없습니다</p>
          <p className="text-sm text-slate-400 text-center">논문 모달에서 📤 버튼으로<br/>첫 번째 의견을 공유해보세요!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              user={user}
              onRequestLogin={onRequestLogin}
              onVote={handleVoteUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
