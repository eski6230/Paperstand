/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { fetchPapersForCategory } from './services/gemini';
import { Paper, UserPreferences } from './types';
import Sidebar from './components/Sidebar';
import PaperList from './components/PaperList';
import PaperModal from './components/PaperModal';
import Onboarding from './components/Onboarding';
import MeTab from './components/MeTab';
import ApiKeyModal from './components/ApiKeyModal';
import AuthButton from './components/AuthButton';
import { Menu, Newspaper, Moon, Sun, Bookmark, RefreshCw, ArrowDown } from 'lucide-react';
import { supabase } from './lib/supabase';
import type { User } from '@supabase/supabase-js';

export default function App() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(() => {
    const saved = localStorage.getItem('medupdate_prefs');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...parsed,
        subscriptions: parsed.subscriptions || [],
        history: parsed.history || [],
        topicWeights: parsed.topicWeights || {}
      };
    }
    return null;
  });

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') || 
             window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'suggestion' | 'new_journals'>('suggestion');
  const [papers, setPapers] = useState<Paper[]>([]);
  const papersCache = useRef<Record<string, Paper[]>>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Pull to refresh state
  const mainRef = useRef<HTMLElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Auth state listener + profile auto-creation
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setCurrentUser(session?.user ?? null);
      // 최초 로그인 시 profiles 테이블에 자동 upsert
      if (event === 'SIGNED_IN' && session?.user) {
        const u = session.user;
        supabase.from('profiles').upsert({
          id: u.id,
          display_name: u.user_metadata?.full_name ?? u.email ?? '익명',
          avatar_url: u.user_metadata?.avatar_url ?? null,
        }, { onConflict: 'id', ignoreDuplicates: true });
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Initialize selected category when preferences load
  useEffect(() => {
    if (preferences && preferences.specialties.length > 0 && !selectedCategory) {
      setSelectedCategory(preferences.specialties[0]);
    }
  }, [preferences, selectedCategory]);

  useEffect(() => {
    if (!preferences || !selectedCategory || selectedCategory === 'History' || selectedCategory === 'My Interest') return;
    
    let isActive = true;
    const cacheKey = `${selectedCategory}-${selectedKeyword || 'all'}-${selectedTab}`;

    const fetchContent = async () => {
      if (papersCache.current[cacheKey] && papersCache.current[cacheKey].length > 0) {
        setPapers(papersCache.current[cacheKey]);
        return;
      }

      setLoading(true);
      setIsStreaming(true);
      setPapers([]);
      setError(null);
      
      // Scroll to top immediately when loading starts
      if (mainRef.current) {
        mainRef.current.scrollTop = 0;
      }
      
      try {
        const finalPapers = await fetchPapersForCategory(
          selectedCategory, 
          selectedKeyword || undefined,
          preferences,
          (streamedPapers) => {
            if (isActive) {
              setPapers(streamedPapers);
              if (streamedPapers.length > 0) {
                setLoading(false);
              }
            }
          },
          selectedTab
        );
        
        if (finalPapers && finalPapers.length > 0) {
          papersCache.current[cacheKey] = finalPapers;
          if (isActive) {
            setPapers(finalPapers);
          }
        } else if (isActive) {
          setError("논문을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
        }
      } catch (error: any) {
        console.error("Failed to fetch papers:", error);
        if (isActive) {
          if (error?.message?.includes("API 키가 설정되지 않았습니다")) {
            setShowApiKeyModal(true);
            setError("API 키가 필요합니다. 설정 메뉴에서 API 키를 등록해주세요.");
          } else if (error?.message?.includes("429") || error?.status === "RESOURCE_EXHAUSTED") {
            setError("현재 AI 서비스 요청이 너무 많습니다. 잠시(약 1분) 후 다시 시도해주세요.");
          } else {
            // Show the actual error message for better debugging
            setError(`오류: ${error.message || "논문을 불러오는 중 알 수 없는 오류가 발생했습니다."}`);
          }
        }
      } finally {
        if (isActive) {
          setLoading(false);
          setIsStreaming(false);
        }
      }
    };

    fetchContent();

    return () => {
      isActive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, selectedKeyword, selectedTab, refreshTrigger]); 
  // Intentionally omitting preferences to prevent re-fetch on vote

  const handleRefresh = () => {
    if (!selectedCategory || selectedCategory === 'History' || selectedCategory === 'My Interest') return;
    const cacheKey = `${selectedCategory}-${selectedKeyword || 'all'}-${selectedTab}`;
    delete papersCache.current[cacheKey];
    setRefreshTrigger(prev => prev + 1);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (mainRef.current && mainRef.current.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    } else {
      startY.current = 0;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY.current > 0) {
      const y = e.touches[0].clientY;
      const dist = y - startY.current;
      if (dist > 0) {
        setPullDistance(Math.min(dist * 0.4, 80));
      } else {
        setPullDistance(0);
      }
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > 60 && !loading && !isStreaming) {
      handleRefresh();
    }
    setPullDistance(0);
    startY.current = 0;
  };

  const savePreferences = (newPrefs: UserPreferences) => {
    setPreferences(newPrefs);
    localStorage.setItem('medupdate_prefs', JSON.stringify(newPrefs));
  };

  const handleOnboardingComplete = (prefs: UserPreferences) => {
    savePreferences(prefs);
    if (prefs.specialties.length > 0) {
      setSelectedCategory(prefs.specialties[0]);
    }
  };

  const handleResetPreferences = () => {
    localStorage.removeItem('medupdate_prefs');
    setPreferences(null);
    setPapers([]);
    papersCache.current = {};
    setSelectedCategory("");
    setSelectedKeyword(null);
  };

  const handleOpenPaper = (paper: Paper) => {
    setSelectedPaper(paper);
    if (preferences) {
      const newHistory = [paper, ...preferences.history.filter(p => p.id !== paper.id)].slice(0, 50);
      
      // Slightly increase weight for viewed keywords
      const newWeights = { ...preferences.topicWeights };
      paper.keywords.forEach(kw => {
        newWeights[kw] = (newWeights[kw] || 0) + 0.5;
      });

      savePreferences({
        ...preferences,
        history: newHistory,
        topicWeights: newWeights
      });
    }
  };

  const handleVote = (paper: Paper, weightChange: number) => {
    if (!preferences) return;
    const newWeights = { ...preferences.topicWeights };
    paper.keywords.forEach(kw => {
      newWeights[kw] = (newWeights[kw] || 0) + weightChange;
    });
    savePreferences({ ...preferences, topicWeights: newWeights });
  };

  const handleSubscribe = (keyword: string) => {
    if (!preferences) return;
    const isSubscribed = preferences.subscriptions.includes(keyword);
    const newSubs = isSubscribed 
      ? preferences.subscriptions.filter(k => k !== keyword)
      : [...preferences.subscriptions, keyword];
    
    savePreferences({ ...preferences, subscriptions: newSubs });
  };

  const handleBubbleClick = (keyword: string) => {
    if (!preferences || preferences.specialties.length === 0) return;
    // Redirect to the first specialty and filter by the clicked keyword
    setSelectedCategory(preferences.specialties[0]);
    setSelectedKeyword(keyword);
  };

  if (!preferences) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-slate-950 font-sans transition-colors duration-200">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar 
        specialties={preferences.specialties}
        selectedCategory={selectedCategory} 
        onSelectCategory={(cat) => {
          setSelectedCategory(cat);
          setSelectedKeyword(null);
          setSelectedTab('suggestion');
        }}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        onResetPreferences={() => setShowResetConfirm(true)}
        onOpenApiKeyModal={() => setShowApiKeyModal(true)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header */}
        <header className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 h-16 flex items-center px-6 shrink-0 justify-between transition-colors duration-200 z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 md:hidden transition-colors">
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
              <Newspaper size={24} />
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Paperstand</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-1 justify-end max-w-md ml-4">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors shrink-0"
              title="Toggle Dark Mode"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <AuthButton user={currentUser} onAuthChange={setCurrentUser} />
          </div>
        </header>

        {/* Pull to refresh indicator */}
        <div 
          className="absolute top-16 left-0 right-0 flex justify-center items-center overflow-hidden transition-all duration-200 z-0"
          style={{ height: `${pullDistance}px`, opacity: pullDistance / 60 }}
        >
          <div className={`flex items-center gap-2 text-indigo-600 dark:text-indigo-400 ${pullDistance > 60 ? 'animate-pulse' : ''}`}>
            <ArrowDown size={20} className={pullDistance > 60 ? 'rotate-180 transition-transform' : 'transition-transform'} />
            <span className="text-sm font-medium">{pullDistance > 60 ? '놓아서 새로고침' : '당겨서 새로고침'}</span>
          </div>
        </div>

        {/* Content Area */}
        <main 
          ref={mainRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="flex-1 overflow-y-auto p-6 md:p-8 relative z-10 bg-slate-50 dark:bg-slate-950 transition-transform duration-200"
          style={{ transform: `translateY(${pullDistance}px)` }}
        >
          <div className="max-w-4xl mx-auto">
            {selectedCategory === 'History' ? (
              <div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mb-6">최근 열람한 논문</h2>
                {preferences.history.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                    아직 열람한 논문이 없습니다.
                  </div>
                ) : (
                  <PaperList 
                    papers={preferences.history} 
                    loading={false} 
                    isStreaming={false}
                    onSelectPaper={handleOpenPaper}
                    onSelectKeyword={setSelectedKeyword}
                  />
                )}
              </div>
            ) : selectedCategory === 'My Interest' ? (
              <MeTab
                topicWeights={preferences.topicWeights}
                historyCount={preferences.history.length}
                onBubbleClick={handleBubbleClick}
                user={currentUser}
                onRequestLogin={() => supabase.auth.signInWithOAuth({
                  provider: 'google',
                  options: { redirectTo: window.location.origin },
                })}
              />
            ) : (
              <>
                <div className="mb-8 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-3">
                      {selectedCategory}
                      <button
                        onClick={handleRefresh}
                        disabled={loading || isStreaming}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors disabled:opacity-50"
                        title="새로운 논문 불러오기"
                      >
                        <RefreshCw size={20} className={loading || isStreaming ? "animate-spin" : ""} />
                      </button>
                    </h2>
                    {selectedKeyword && (
                      <div className="flex items-center gap-2 mt-3">
                        <span className="text-sm text-slate-500 dark:text-slate-400">Filtered by keyword:</span>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300">
                          {selectedKeyword}
                          <button 
                            onClick={() => setSelectedKeyword(null)}
                            className="ml-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-200"
                          >
                            &times;
                          </button>
                        </span>
                      </div>
                    )}
                    <p className="text-slate-500 dark:text-slate-400 mt-2">
                      {selectedCategory === 'Subscriptions' 
                        ? '구독하신 주제들의 최신 논문을 모아봅니다.' 
                        : '주요 저널의 핵심 논문을 요약해 드립니다.'}
                    </p>
                  </div>
                </div>

                {selectedCategory !== 'Subscriptions' && selectedCategory !== 'History' && selectedCategory !== 'My Interest' && (
                  <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl mb-6 w-fit">
                    <button
                      onClick={() => setSelectedTab('suggestion')}
                      className={`px-5 py-2 text-sm font-medium rounded-lg transition-colors ${
                        selectedTab === 'suggestion'
                          ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-indigo-300'
                          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                      }`}
                    >
                      Suggestion
                    </button>
                    <button
                      onClick={() => setSelectedTab('new_journals')}
                      className={`px-5 py-2 text-sm font-medium rounded-lg transition-colors ${
                        selectedTab === 'new_journals'
                          ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-indigo-300'
                          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                      }`}
                    >
                      Recently published
                    </button>
                  </div>
                )}

                {selectedCategory === 'Subscriptions' && preferences.subscriptions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    <button
                      onClick={() => setSelectedKeyword(null)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        !selectedKeyword 
                          ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900' 
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      All Subscriptions
                    </button>
                    {preferences.subscriptions.map(sub => (
                      <button
                        key={sub}
                        onClick={() => setSelectedKeyword(sub)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                          selectedKeyword === sub 
                            ? 'bg-indigo-600 text-white' 
                            : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/20'
                        }`}
                      >
                        <Bookmark size={14} />
                        {sub}
                      </button>
                    ))}
                  </div>
                )}

                {error ? (
                  <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-2xl p-8 text-center">
                    <p className="text-rose-800 dark:text-rose-300 font-medium mb-4">{error}</p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                      <button 
                        onClick={handleRefresh}
                        className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-medium transition-colors w-full sm:w-auto"
                      >
                        다시 시도하기
                      </button>
                      {error.includes("API 키") && (
                        <button 
                          onClick={() => setShowApiKeyModal(true)}
                          className="px-6 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-sm font-medium transition-colors w-full sm:w-auto"
                        >
                          API 키 설정하기
                        </button>
                      )}
                    </div>
                  </div>
                ) : selectedCategory === 'Subscriptions' && preferences.subscriptions.length === 0 ? (
                  <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                    <Bookmark size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">구독 중인 주제가 없습니다</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                      논문 상세 페이지에서 관심 있는 키워드를 구독해보세요.
                    </p>
                  </div>
                ) : (
                  <PaperList 
                    papers={papers} 
                    loading={loading} 
                    isStreaming={isStreaming}
                    onSelectPaper={handleOpenPaper}
                    onSelectKeyword={setSelectedKeyword}
                  />
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* Settings Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-sm w-full p-6 border border-slate-100 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">관심사 재설정</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
              선호하는 주제와 논문을 다시 선택하시겠습니까? 기존 설정은 초기화됩니다.
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                취소
              </button>
              <button 
                onClick={() => {
                  setShowResetConfirm(false);
                  handleResetPreferences();
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Paper Modal */}
      {selectedPaper && (
        <PaperModal
          initialPaper={selectedPaper}
          onClose={() => setSelectedPaper(null)}
          onSelectKeyword={(kw) => {
            setSelectedKeyword(kw);
            setSelectedPaper(null);
          }}
          onVote={handleVote}
          onSubscribe={handleSubscribe}
          subscriptions={preferences.subscriptions}
          user={currentUser}
        />
      )}

      <ApiKeyModal 
        isOpen={showApiKeyModal} 
        onClose={() => setShowApiKeyModal(false)} 
        onSave={() => {
          setShowApiKeyModal(false);
          handleRefresh();
        }}
      />
    </div>
  );
}


