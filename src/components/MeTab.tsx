import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { ThumbsUp, ThumbsDown, MessageCircle, Sparkles, ExternalLink, LogIn } from 'lucide-react';

interface MeTabProps {
  topicWeights: Record<string, number>;
  historyCount: number;
  onBubbleClick: (keyword: string) => void;
  user: User | null;
  onRequestLogin: () => void;
}

interface VotedPaper {
  paper_id: string;
  paper_title: string;
  vote: 1 | -1;
  created_at: string;
}

interface CommentRecord {
  paper_id: string;
  paper_title: string;
  content: string;
  created_at: string;
}

type ActiveTab = 'bubble' | 'voted' | 'commented';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금 전';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export default function MeTab({ topicWeights, historyCount, onBubbleClick, user, onRequestLogin }: MeTabProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('bubble');
  const [votedPapers, setVotedPapers] = useState<VotedPaper[]>([]);
  const [commentedPapers, setCommentedPapers] = useState<CommentRecord[]>([]);
  const [loadingVotes, setLoadingVotes] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);

  // Fetch voted papers
  useEffect(() => {
    if (!user || activeTab !== 'voted') return;
    setLoadingVotes(true);
    supabase
      .from('paper_votes')
      .select('paper_id, paper_title, vote, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setVotedPapers((data as VotedPaper[]) || []);
        setLoadingVotes(false);
      });
  }, [user, activeTab]);

  // Fetch commented papers
  useEffect(() => {
    if (!user || activeTab !== 'commented') return;
    setLoadingComments(true);
    supabase
      .from('paper_comments')
      .select('paper_id, paper_title, content, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setCommentedPapers((data as CommentRecord[]) || []);
        setLoadingComments(false);
      });
  }, [user, activeTab]);

  // D3 bubble chart
  useEffect(() => {
    if (activeTab !== 'bubble' || !svgRef.current) return;

    const data = Object.entries(topicWeights)
      .filter(([_, value]) => value > 0)
      .map(([id, value]) => ({ id, value: Math.max(1, value) }));

    const width = 600;
    const height = 600;

    d3.select(svgRef.current).selectAll('*').remove();

    if (data.length === 0) {
      d3.select(svgRef.current)
        .attr('viewBox', `0 0 ${width} ${height}`)
        .append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .style('fill', '#94a3b8')
        .text('아직 충분한 데이터가 없습니다. 논문을 더 읽어보세요!');
      return;
    }

    const pack = d3.pack<{ id: string; value: number }>()
      .size([width, height])
      .padding(5);

    const root = d3.hierarchy({ children: data } as any)
      .sum((d: any) => d.value);

    const nodes = pack(root).leaves();

    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('max-width', '100%')
      .style('height', 'auto');

    const color = d3.scaleOrdinal(d3.schemeTableau10);

    const node = svg.selectAll('g')
      .data(nodes)
      .join('g')
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .style('cursor', 'pointer')
      .on('click', (_event, d) => { onBubbleClick(d.data.id); })
      .on('mouseover', function() {
        d3.select(this).select('circle').attr('fill-opacity', 1).attr('stroke-width', 4);
      })
      .on('mouseout', function() {
        d3.select(this).select('circle').attr('fill-opacity', 0.7).attr('stroke-width', 2);
      });

    node.append('circle')
      .attr('r', d => d.r)
      .attr('fill', (_d, i) => color(i.toString()))
      .attr('fill-opacity', 0.7)
      .attr('stroke', (_d, i) => color(i.toString()))
      .attr('stroke-width', 2)
      .style('transition', 'all 0.3s ease');

    node.append('text')
      .text(d => d.data.id)
      .attr('text-anchor', 'middle')
      .attr('dy', '.3em')
      .style('font-size', '14px')
      .style('fill', '#fff')
      .style('font-weight', 'bold')
      .style('pointer-events', 'none')
      .each(function(d) {
        const textNode = this as SVGTextElement;
        const w = textNode.getComputedTextLength();
        const available = d.r * 2 - 8;
        const newSize = w > available && available > 0
          ? Math.max(8, Math.floor(14 * (available / w)))
          : Math.min(16, d.r / 2.5);
        d3.select(this).style('font-size', `${newSize}px`);
      });
  }, [topicWeights, activeTab]);

  const tabs: { key: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { key: 'bubble', label: '관심 버블', icon: <Sparkles size={15} /> },
    { key: 'voted', label: '추천한 논문', icon: <ThumbsUp size={15} /> },
    { key: 'commented', label: '내 댓글', icon: <MessageCircle size={15} /> },
  ];

  const LoginPrompt = () => (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-500/10 rounded-full flex items-center justify-center mb-4">
        <LogIn size={28} className="text-indigo-500" />
      </div>
      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">로그인이 필요합니다</h3>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-5">
        추천·댓글 기록을 확인하려면 로그인해 주세요.
      </p>
      <button
        onClick={onRequestLogin}
        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors"
      >
        Google로 로그인
      </button>
    </div>
  );

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
      {/* 상단 통계 배너 */}
      <div className="bg-indigo-50 dark:bg-indigo-500/10 p-6 border-b border-indigo-100 dark:border-indigo-500/20">
        <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-100 mb-1">
          지금까지 총 {historyCount}편의 논문을 살펴보셨습니다 🎉
        </h3>
        <p className="text-indigo-700 dark:text-indigo-300 text-sm">
          꾸준한 지식 업데이트가 선생님의 진료에 큰 힘이 될 것입니다.
        </p>
      </div>

      {/* 탭 내비게이션 */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 pt-4 gap-1">
        {tabs.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
              activeTab === key
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-500/10'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <div className="p-6">

        {/* ── 버블 탭 ── */}
        {activeTab === 'bubble' && (
          <div className="flex flex-col items-center">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">My Interest Bubble</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                열람·추천하신 주제 비중입니다. 버블을 클릭하면 관련 논문을 볼 수 있어요.
              </p>
            </div>
            <div className="w-full max-w-lg aspect-square">
              <svg ref={svgRef} className="w-full h-full" />
            </div>
          </div>
        )}

        {/* ── 추천한 논문 탭 ── */}
        {activeTab === 'voted' && (
          !user ? <LoginPrompt /> :
          loadingVotes ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : votedPapers.length === 0 ? (
            <div className="text-center py-16">
              <ThumbsUp size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-500 dark:text-slate-400 text-sm">아직 추천/비추천한 논문이 없습니다.<br/>논문 상세 페이지에서 투표해보세요!</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">총 {votedPapers.length}편에 투표했습니다.</p>
              {votedPapers.map((v, i) => (
                <div key={i} className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-500/40 transition-colors group">
                  <div className={`shrink-0 mt-0.5 w-8 h-8 rounded-full flex items-center justify-center ${
                    v.vote === 1
                      ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400'
                  }`}>
                    {v.vote === 1 ? <ThumbsUp size={16} /> : <ThumbsDown size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-snug line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {v.paper_title}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{timeAgo(v.created_at)}</p>
                  </div>
                  <a
                    href={`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(v.paper_title.split(' ').slice(0, 8).join(' '))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="shrink-0 p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all"
                    title="PubMed에서 보기"
                  >
                    <ExternalLink size={15} />
                  </a>
                </div>
              ))}
            </div>
          )
        )}

        {/* ── 내 댓글 탭 ── */}
        {activeTab === 'commented' && (
          !user ? <LoginPrompt /> :
          loadingComments ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : commentedPapers.length === 0 ? (
            <div className="text-center py-16">
              <MessageCircle size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-500 dark:text-slate-400 text-sm">아직 댓글을 작성하지 않으셨습니다.<br/>논문 상세 페이지에서 의견을 남겨보세요!</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">총 {commentedPapers.length}개의 댓글을 작성했습니다.</p>
              {commentedPapers.map((c, i) => (
                <div key={i} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-500/40 transition-colors group">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 line-clamp-1 flex-1">
                      {c.paper_title}
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-slate-400 dark:text-slate-500">{timeAgo(c.created_at)}</span>
                      <a
                        href={`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(c.paper_title.split(' ').slice(0, 8).join(' '))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all"
                        title="PubMed에서 보기"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {c.content}
                  </p>
                </div>
              ))}
            </div>
          )
        )}

      </div>
    </div>
  );
}
