import { Paper, RelatedArticle } from '../types';
import { X, ExternalLink, BookOpen, ChevronRight, ThumbsUp, ThumbsDown, BookmarkPlus, BookmarkCheck, MessageCircle, Send, ArrowLeft, Loader2, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useState, useRef } from 'react';
import { askQuestionAboutPaper, fetchSpecificPaperDetails, fetchPaperDetails } from '../services/gemini';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import ShareToCommunityModal from './ShareToCommunityModal';

interface PaperModalProps {
  initialPaper: Paper;
  onClose: () => void;
  onSelectKeyword: (keyword: string) => void;
  onVote: (paper: Paper, weight: number) => void;
  onSubscribe: (keyword: string) => void;
  subscriptions: string[];
  user: User | null;
  onRequestLogin: () => void;
}

export default function PaperModal({ initialPaper, onClose, onSelectKeyword, onVote, onSubscribe, subscriptions, user, onRequestLogin }: PaperModalProps) {
  const [paperStack, setPaperStack] = useState<Paper[]>([initialPaper]);
  const [isFetchingRelated, setIsFetchingRelated] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const [question, setQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState<{q: string, a: string, foundInPaper?: boolean, isSearching?: boolean}[]>([]);
  const [isAsking, setIsAsking] = useState(false);

  // Vote state
  const [voteCount, setVoteCount] = useState(0);
  const [userVote, setUserVote] = useState<1 | -1 | null>(null);
  const [isVoting, setIsVoting] = useState(false);

  // Community share modal
  const [showShareModal, setShowShareModal] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentPaper = paperStack[paperStack.length - 1];

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    // Load votes for current paper
    const loadVotes = async () => {
      const { data } = await supabase
        .from('paper_votes')
        .select('vote, user_id')
        .eq('paper_id', currentPaper.id);
      if (data) {
        const total = data.reduce((sum, v) => sum + v.vote, 0);
        setVoteCount(total);
        if (user) {
          const mine = data.find(v => v.user_id === user.id);
          setUserVote(mine ? (mine.vote as 1 | -1) : null);
        }
      }
    };
    loadVotes();
  }, [currentPaper.id, user]);

  useEffect(() => {
    // Reset chat when paper changes
    setChatHistory([]);
    setQuestion("");

    // Scroll to top
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }

    // Load details if missing
    async function loadDetails() {
      if (!currentPaper.detailedSummary && !isLoadingDetails) {
        setIsLoadingDetails(true);
        try {
          const details = await fetchPaperDetails(currentPaper);
          setPaperStack(prev => {
            const newStack = [...prev];
            newStack[newStack.length - 1] = { ...currentPaper, ...details };
            return newStack;
          });
        } catch (e) {
          console.error("Failed to fetch details", e);
        } finally {
          setIsLoadingDetails(false);
        }
      }
    }
    loadDetails();
  }, [currentPaper.id]);

  useEffect(() => {
    if (chatHistory.length > 0 && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory, isAsking]);

  const handleAsk = async () => {
    if (!question.trim() || isAsking) return;
    const q = question;
    setQuestion("");
    setIsAsking(true);

    // Add optimistic user message
    setChatHistory(prev => [...prev, { q, a: "" }]);

    try {
      const response = await askQuestionAboutPaper(currentPaper, q);
      setChatHistory(prev => {
        const newHistory = [...prev];
        newHistory[newHistory.length - 1].a = response.answer;
        newHistory[newHistory.length - 1].foundInPaper = response.foundInPaper;
        return newHistory;
      });
    } catch (e) {
      setChatHistory(prev => {
        const newHistory = [...prev];
        newHistory[newHistory.length - 1].a = "오류가 발생했습니다. 다시 시도해주세요.";
        return newHistory;
      });
    } finally {
      setIsAsking(false);
    }
  };

  const handleExternalSearch = async (idx: number) => {
    const chat = chatHistory[idx];
    if (!chat || isAsking) return;

    setIsAsking(true);
    setChatHistory(prev => {
      const newHistory = [...prev];
      newHistory[idx].isSearching = true;
      return newHistory;
    });

    try {
      const { askQuestionWithSearch } = await import('../services/gemini');
      const answer = await askQuestionWithSearch(currentPaper, chat.q);

      setChatHistory(prev => {
        const newHistory = [...prev];
        newHistory[idx].a = answer;
        newHistory[idx].foundInPaper = true;
        newHistory[idx].isSearching = false;
        return newHistory;
      });
    } catch (e) {
      setChatHistory(prev => {
        const newHistory = [...prev];
        newHistory[idx].a = "외부 검색 중 오류가 발생했습니다. 다시 시도해주세요.";
        newHistory[idx].isSearching = false;
        return newHistory;
      });
    } finally {
      setIsAsking(false);
    }
  };

  const handleRelatedClick = async (article: RelatedArticle) => {
    const skeletonPaper: Paper = {
      id: `related-skeleton-${Date.now()}`,
      title: article.title,
      journal: article.journal,
      date: '',
      keywords: [],
      shortSummary: "AI가 논문을 분석 중입니다...",
      url: article.url || `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(article.title.split(' ').slice(0, 8).join(' '))}`,
    };

    setPaperStack(prev => [...prev, skeletonPaper]);
    setIsLoadingDetails(true);

    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }

    try {
      const newPaper = await fetchSpecificPaperDetails(article);
      setPaperStack(prev => {
        const newStack = [...prev];
        newStack[newStack.length - 1] = newPaper;
        return newStack;
      });
    } catch (e) {
      console.error("Failed to fetch related paper", e);
      alert("논문 정보를 불러오는데 실패했습니다.");
      setPaperStack(prev => prev.slice(0, -1));
    } finally {
      setIsFetchingRelated(false);
      setIsLoadingDetails(false);
    }
  };

  const handleVoteClick = async (direction: 1 | -1) => {
    if (!user || isVoting) return;
    setIsVoting(true);
    try {
      const isSameVote = userVote === direction;
      if (isSameVote) {
        await supabase.from('paper_votes').delete()
          .eq('user_id', user.id).eq('paper_id', currentPaper.id);
        setVoteCount(prev => prev - direction);
        setUserVote(null);
        onVote(currentPaper, -direction);
      } else {
        await supabase.from('paper_votes').upsert({
          user_id: user.id,
          paper_id: currentPaper.id,
          paper_title: currentPaper.title,
          vote: direction,
        }, { onConflict: 'user_id,paper_id' });
        const diff = userVote ? direction - userVote : direction;
        setVoteCount(prev => prev + diff);
        setUserVote(direction);
        onVote(currentPaper, diff);
      }
    } finally {
      setIsVoting(false);
    }
  };

  const handleBack = () => {
    if (paperStack.length > 1) {
      setPaperStack(prev => prev.slice(0, -1));
    }
  };

  const handleShareClick = () => {
    if (!user) {
      onRequestLogin();
      return;
    }
    setShowShareModal(true);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-3xl max-h-[92vh] sm:max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800"
        >
          {/* Header */}
          <div className="flex items-start justify-between px-4 py-3 sm:p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div className="pr-8 flex-1 min-w-0">
              <div className="flex items-center flex-wrap gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-1.5 sm:mb-2">
                {paperStack.length > 1 && (
                  <button
                    onClick={handleBack}
                    className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 px-2 py-0.5 rounded transition-colors"
                  >
                    <ArrowLeft size={13} /> 뒤로
                  </button>
                )}
                <span className="font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded">{currentPaper.journal}</span>
                <span>{currentPaper.date}</span>
              </div>
              <h2 className="text-base sm:text-2xl font-bold text-slate-900 dark:text-slate-100 leading-snug line-clamp-3 sm:line-clamp-none">
                {currentPaper.title}
              </h2>
              <div className="flex flex-wrap gap-1.5 mt-2 sm:mt-4">
                {currentPaper.keywords.slice(0, window.innerWidth < 640 ? 3 : undefined).map((kw) => {
                  const isSubscribed = subscriptions.includes(kw);
                  return (
                    <div key={kw} className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <button
                        onClick={() => {
                          onClose();
                          onSelectKeyword(kw);
                        }}
                        className="text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 px-2.5 py-1 transition-colors"
                      >
                        {kw}
                      </button>
                      <button
                        onClick={() => onSubscribe(kw)}
                        title={isSubscribed ? "구독 취소" : "이 주제 구독하기"}
                        className={`px-1.5 py-1 transition-colors ${
                          isSubscribed
                            ? 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/20'
                            : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {isSubscribed ? <BookmarkCheck size={12} /> : <BookmarkPlus size={12} />}
                      </button>
                    </div>
                  );
                })}
                {window.innerWidth < 640 && currentPaper.keywords.length > 3 && (
                  <span className="text-xs text-slate-400 dark:text-slate-500 px-2 py-1">
                    +{currentPaper.keywords.length - 3}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors shrink-0"
            >
              <X size={20} />
            </button>
          </div>

          {isFetchingRelated && (
            <div className="absolute inset-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center">
              <Loader2 size={48} className="text-indigo-600 animate-spin mb-6" />
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 text-center px-4">새로운 논문 불러오는 중...</h3>
              <p className="text-slate-600 dark:text-slate-300 font-medium text-center px-6 text-lg">
                선택하신 관련 논문의 상세 정보를 AI가 분석하고 있습니다.
              </p>
            </div>
          )}

          {/* Scrollable Content */}
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6 space-y-8 relative">
            <div className={isFetchingRelated ? "opacity-0 pointer-events-none" : "space-y-8"}>
              {/* Detailed Summary */}
              <section>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4 flex items-center gap-2">
                <BookOpen size={18} className="text-indigo-500" />
                Detailed Abstract Summary
              </h3>
              <div className="prose prose-slate dark:prose-invert prose-sm max-w-none">
                {isLoadingDetails ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <Loader2 size={32} className="animate-spin text-indigo-500 mb-4" />
                    <p className="font-medium text-slate-700 dark:text-slate-300">AI가 논문을 분석하고 요약 중입니다...</p>
                    <p className="text-xs mt-2 mb-6">잠시만 기다려주세요.</p>
                    <a
                      href={currentPaper.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      PubMed에서 원문 보기
                      <ExternalLink size={16} />
                    </a>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(currentPaper.detailedSummary || currentPaper.shortSummary || "").split(/\\n|\n/).filter(line => line.trim() !== '').map((line, i) => (
                      <p key={i} className="flex items-start gap-3 text-slate-700 dark:text-slate-300 leading-relaxed">
                        <span className="text-indigo-400 font-bold shrink-0 mt-0.5">•</span>
                        <span>{line.replace(/^\d+\.\s*/, '')}</span>
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {!isLoadingDetails && (
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <a
                    href={currentPaper.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
                  >
                    Search on PubMed
                    <ExternalLink size={16} />
                  </a>

                  {/* 투표 + 커뮤니티 공유 묶음 */}
                  <div className="flex items-center gap-2 ml-auto">
                    {/* 투표 */}
                    <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => user ? handleVoteClick(1) : onRequestLogin()}
                        title={user ? "유용한 논문" : "로그인 후 투표 가능"}
                        disabled={isVoting}
                        className={`p-2 rounded-lg transition-colors disabled:cursor-not-allowed ${
                          userVote === 1
                            ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/20'
                            : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 disabled:opacity-40'
                        }`}
                      >
                        <ThumbsUp size={18} />
                      </button>
                      <span className={`text-sm font-semibold min-w-[1.5rem] text-center ${
                        voteCount > 0 ? 'text-emerald-600 dark:text-emerald-400' :
                        voteCount < 0 ? 'text-rose-600 dark:text-rose-400' :
                        'text-slate-500 dark:text-slate-400'
                      }`}>
                        {voteCount > 0 ? `+${voteCount}` : voteCount}
                      </span>
                      <button
                        onClick={() => user ? handleVoteClick(-1) : onRequestLogin()}
                        title={user ? "별로인 논문" : "로그인 후 투표 가능"}
                        disabled={isVoting}
                        className={`p-2 rounded-lg transition-colors disabled:cursor-not-allowed ${
                          userVote === -1
                            ? 'text-rose-600 bg-rose-50 dark:bg-rose-500/20'
                            : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 disabled:opacity-40'
                        }`}
                      >
                        <ThumbsDown size={18} />
                      </button>
                    </div>

                    {/* 커뮤니티 공유 버튼 */}
                    <button
                      onClick={handleShareClick}
                      title="커뮤니티에 공유"
                      className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-500/30 rounded-xl transition-colors"
                    >
                      <Share2 size={16} />
                      <span className="hidden sm:inline">공유</span>
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* Q&A Section */}
            <section className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-5 border border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <MessageCircle size={18} className="text-indigo-500" />
                논문에 대해 질문하기
              </h3>

              <div className="space-y-4 mb-4 max-h-60 overflow-y-auto pr-2">
                {chatHistory.map((chat, idx) => (
                  <div key={idx} className="space-y-3 text-sm">
                    <div className="flex justify-end">
                      <div className="bg-indigo-600 text-white px-4 py-2 rounded-2xl rounded-tr-sm max-w-[85%]">
                        {chat.q}
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="flex flex-col gap-2 max-w-[85%]">
                        <div className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-2xl rounded-tl-sm">
                          {chat.a ? chat.a : <Loader2 size={16} className="animate-spin text-indigo-500" />}
                        </div>
                        {chat.foundInPaper === false && (
                          <div className="flex items-center gap-2 mt-1 ml-2">
                            <span className="text-xs text-slate-500 dark:text-slate-400">다른 소스를 활용해 검색할까요?</span>
                            <button
                              onClick={() => handleExternalSearch(idx)}
                              disabled={chat.isSearching || isAsking}
                              className="px-3 py-1 text-xs font-medium text-white bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 rounded-full transition-colors flex items-center gap-1"
                            >
                              {chat.isSearching ? <Loader2 size={12} className="animate-spin" /> : null}
                              예, 검색하기
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                  placeholder="예: 이 연구에서 대조군이 사용한 약물은 무엇인가요?"
                  className="flex-1 px-4 py-2.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-500 dark:text-white"
                  disabled={isAsking}
                />
                <button
                  onClick={handleAsk}
                  disabled={isAsking || !question.trim()}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-xl transition-colors flex items-center justify-center"
                >
                  <Send size={18} />
                </button>
              </div>
            </section>

            {/* Related Articles */}
            {isLoadingDetails ? (
              <section className="border-t border-slate-100 dark:border-slate-800 pt-8">
                <div className="flex flex-col items-center justify-center py-8 text-slate-500 dark:text-slate-400">
                  <Loader2 size={24} className="animate-spin text-indigo-400 mb-3" />
                  <span className="text-sm font-medium">관련 논문을 찾고 있습니다...</span>
                </div>
              </section>
            ) : currentPaper.relatedArticles && currentPaper.relatedArticles.length > 0 ? (
              <section className="border-t border-slate-100 dark:border-slate-800 pt-8">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4">
                  Related Reviews & Papers
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {currentPaper.relatedArticles.map((article, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleRelatedClick(article)}
                      className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-500/50 transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          article.type.toLowerCase().includes('review')
                            ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                            : 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300'
                        }`}>
                          {article.type}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{article.journal}</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                        {article.title}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3">
                        {article.shortDescription}
                      </p>
                      <div className="mt-3 flex items-center text-xs font-medium text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        Explore <ChevronRight size={14} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
            </div>
          </div>
        </motion.div>
      </div>

      {/* 커뮤니티 공유 모달 */}
      {showShareModal && (
        <ShareToCommunityModal
          paper={currentPaper}
          user={user}
          onClose={() => setShowShareModal(false)}
          onSubmit={() => setShowShareModal(false)}
        />
      )}
    </AnimatePresence>
  );
}
