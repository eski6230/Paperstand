/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { fetchLitePapersForCategory, generateKoreanOneLinerBatch } from './services/gemini';
import { Paper, UserPreferences } from './types';
import Sidebar from './components/Sidebar';
import PaperList from './components/PaperList';
import HomeFeed from './components/HomeFeed';
import PaperModal from './components/PaperModal';
import ApiKeyModal from './components/ApiKeyModal';
import AuthButton from './components/AuthButton';
import BottomNav from './components/BottomNav';
import CategoryTabs from './components/CategoryTabs';
import PrivacyPolicyModal from './components/PrivacyPolicyModal';
import { Menu, Newspaper, Moon, Sun, Bookmark, RefreshCw, ArrowDown } from 'lucide-react';
import { supabase } from './lib/supabase';
import type { User } from '@supabase/supabase-js';

// ─── View type ────────────────────────────────────────────────────────────────
// 'home'     → multi-specialty newspaper feed (HomeFeed)
// 'category' → single-specialty or subscriptions view (PaperList)
type CurrentView = 'home' | 'category';

// 저장된 설정이 없을 때 사용하는 기본값
const defaultPreferences: UserPreferences = {
  specialties: ['Cardiology', 'Neurology', 'Oncology'],
  subTopics: {},
  journals: [],
  subscriptions: [],
  history: [],
  topicWeights: {},
};

export default function App() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(() => {
    const saved = localStorage.getItem('medupdate_prefs');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...parsed,
        subscriptions: parsed.subscriptions || [],
        history: parsed.history || [],
        topicWeights: parsed.topicWeights || {},
      };
    }
    return null;
  });

  // 저장된 설정이 없으면 defaultPreferences로 동작
  const activePreferences = preferences ?? defaultPreferences;

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') ||
             window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // ── View routing ─────────────────────────────────────────────────────────────
  const [currentView, setCurrentView] = useState<CurrentView>('home');

  // ── Home state (independent — never shares data with category view) ──────────
  const [homePapers, setHomePapers] = useState<Record<string, Paper[]>>({});
  const [homeLoading, setHomeLoading] = useState<Record<string, boolean>>({});

  // ── Category / Subscription view state ───────────────────────────────────────
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'suggestion' | 'new_journals'>('suggestion');
  const [papers, setPapers] = useState<Paper[]>([]);

  // ── Shared caches ─────────────────────────────────────────────────────────────
  const papersCache = useRef<Record<string, Paper[]>>({});
  // Caches AI-generated summaries keyed by paper.id so re-opens are instant
  const summaryCache = useRef<Record<string, Partial<Paper>>>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Track last visited specialty for "By Specialties" BottomNav tap
  const lastSpecialtyRef = useRef<string>('');
  useEffect(() => {
    if (currentView === 'category' && selectedCategory && selectedCategory !== 'Subscriptions') {
      lastSpecialtyRef.current = selectedCategory;
    }
  }, [currentView, selectedCategory]);

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

  // ── Home fetch: parallel per-specialty, independent of category state ─────────
  useEffect(() => {
    if (currentView !== 'home') return;

    const specialties = activePreferences.specialties;

    // Mark all as loading; clear stale papers
    setHomePapers({});
    setHomeLoading(Object.fromEntries(specialties.map(s => [s, true])));

    specialties.forEach(async (specialty) => {
      const cacheKey = `${specialty}-all-suggestion`;

      if (papersCache.current[cacheKey]?.length > 0) {
        setHomePapers(prev => ({ ...prev, [specialty]: papersCache.current[cacheKey] }));
        setHomeLoading(prev => ({ ...prev, [specialty]: false }));
        return;
      }

      try {
        const fetched = await fetchLitePapersForCategory(
          specialty, undefined, activePreferences, 'suggestion', 4,
        );
        if (fetched.length > 0) {
          papersCache.current[cacheKey] = fetched;
          setHomePapers(prev => ({ ...prev, [specialty]: fetched }));

          // Background: Korean 1-liner batch — non-blocking, silent-fail
          generateKoreanOneLinerBatch(fetched).then(koreanMap => {
            if (Object.keys(koreanMap).length === 0) return;
            setHomePapers(prev => {
              const cur = prev[specialty];
              if (!cur) return prev;
              const updated = cur.map(p => ({
                ...p, koreanSummary: koreanMap[p.id] ?? p.koreanSummary,
              }));
              papersCache.current[cacheKey] = updated;
              return { ...prev, [specialty]: updated };
            });
          });
        }
      } finally {
        setHomeLoading(prev => ({ ...prev, [specialty]: false }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView, activePreferences.specialties.join(','), refreshTrigger]);

  // ── Category fetch: only fires when currentView === 'category' ────────────────
  useEffect(() => {
    if (currentView !== 'category' || !selectedCategory) return;

    let isActive = true;
    const cacheKey = `${selectedCategory}-${selectedKeyword || 'all'}-${selectedTab}`;

    const fetchContent = async () => {
      if (papersCache.current[cacheKey]?.length > 0) {
        setPapers(papersCache.current[cacheKey]);
        return;
      }

      setLoading(true);
      setIsStreaming(false);
      setPapers([]);
      setError(null);

      if (mainRef.current) mainRef.current.scrollTop = 0;

      try {
        const results = await fetchLitePapersForCategory(
          selectedCategory,
          selectedKeyword || undefined,
          activePreferences,
          selectedTab,
          7,
        );

        if (results.length > 0) {
          const enriched = results.map(p => ({
            ...p,
            ...(summaryCache.current[p.id] ?? {}),
          }));
          papersCache.current[cacheKey] = enriched;
          if (isActive) {
            setPapers(enriched);

            // Background: Korean 1-liner for papers that don't have full AI summary yet
            const liteOnly = enriched.filter(p => !p.shortSummary);
            if (liteOnly.length > 0) {
              generateKoreanOneLinerBatch(liteOnly).then(koreanMap => {
                if (!isActive || Object.keys(koreanMap).length === 0) return;
                setPapers(prev => prev.map(p => ({
                  ...p, koreanSummary: koreanMap[p.id] ?? p.koreanSummary,
                })));
                // Update papersCache too so next visit uses Korean
                if (papersCache.current[cacheKey]) {
                  papersCache.current[cacheKey] = papersCache.current[cacheKey].map(p => ({
                    ...p, koreanSummary: koreanMap[p.id] ?? p.koreanSummary,
                  }));
                }
              });
            }
          }
        } else if (isActive) {
          setError('논문을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
        }
      } catch (err: any) {
        console.error('Failed to fetch papers:', err);
        if (isActive) setError(`오류: ${err.message || '논문을 불러오는 중 알 수 없는 오류가 발생했습니다.'}`);
      } finally {
        if (isActive) setLoading(false);
      }
    };

    fetchContent();
    return () => { isActive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView, selectedCategory, selectedKeyword, selectedTab, refreshTrigger]);

  // ── Navigation helpers ────────────────────────────────────────────────────────

  /** Go to the newspaper home feed. Clears category view state to prevent leakage. */
  const navigateHome = () => {
    setCurrentView('home');
    setPapers([]);  // clear category papers — home uses homePapers, not papers
  };

  /** Go to a single category or subscriptions view. Clears home state coupling. */
  const navigateToCategory = (cat: string, keyword?: string) => {
    setCurrentView('category');
    setSelectedCategory(cat);
    setSelectedKeyword(keyword ?? null);
    setSelectedTab('suggestion');
  };

  const handleRefresh = () => {
    if (currentView === 'home') {
      activePreferences.specialties.forEach(s => {
        delete papersCache.current[`${s}-all-suggestion`];
      });
      setHomePapers({});
      setHomeLoading({});
      setRefreshTrigger(prev => prev + 1);
      return;
    }
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
    if (pullDistance > 60 && !loading && !isStreaming) handleRefresh();
    setPullDistance(0);
    startY.current = 0;
  };

  const savePreferences = (newPrefs: UserPreferences) => {
    setPreferences(newPrefs);
    localStorage.setItem('medupdate_prefs', JSON.stringify(newPrefs));
  };

  const handleResetPreferences = () => {
    localStorage.removeItem('medupdate_prefs');
    setPreferences(null);
    setPapers([]);
    setHomePapers({});
    setHomeLoading({});
    papersCache.current = {};
    setSelectedCategory('');
    setSelectedKeyword(null);
    setCurrentView('home');
  };

  const handleOpenPaper = (paper: Paper) => {
    // Enrich with cached AI summaries so re-opens show content instantly
    const enriched: Paper = { ...paper, ...(summaryCache.current[paper.id] ?? {}) };
    setSelectedPaper(enriched);
    const newHistory = [enriched, ...activePreferences.history.filter(p => p.id !== paper.id)].slice(0, 50);
    const newWeights = { ...activePreferences.topicWeights };
    (enriched.keywords.length > 0 ? enriched.keywords : paper.keywords).forEach(kw => {
      newWeights[kw] = (newWeights[kw] || 0) + 0.5;
    });
    savePreferences({ ...activePreferences, history: newHistory, topicWeights: newWeights });
  };

  /** Called by PaperModal once AI summaries are ready — cache + update live views */
  const handleSummarized = (paperId: string, data: Partial<Paper>) => {
    summaryCache.current[paperId] = { ...(summaryCache.current[paperId] ?? {}), ...data };

    // Update the open modal
    setSelectedPaper(prev =>
      prev && prev.id === paperId ? { ...prev, ...data } : prev
    );

    // Update the category list if the paper is there
    setPapers(prev => prev.map(p => p.id === paperId ? { ...p, ...data } : p));

    // Update homePapers if the paper lives in any home section
    setHomePapers(prev => {
      const next = { ...prev };
      let changed = false;
      Object.keys(next).forEach(spec => {
        if (next[spec].some(p => p.id === paperId)) {
          next[spec] = next[spec].map(p => p.id === paperId ? { ...p, ...data } : p);
          papersCache.current[`${spec}-all-suggestion`] = next[spec];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  };

  const handleVote = (paper: Paper, weightChange: number) => {
    const newWeights = { ...activePreferences.topicWeights };
    paper.keywords.forEach(kw => {
      newWeights[kw] = (newWeights[kw] || 0) + weightChange;
    });
    savePreferences({ ...activePreferences, topicWeights: newWeights });
  };

  const handleSubscribe = (keyword: string) => {
    const isSubscribed = activePreferences.subscriptions.includes(keyword);
    const newSubs = isSubscribed
      ? activePreferences.subscriptions.filter(k => k !== keyword)
      : [...activePreferences.subscriptions, keyword];
    savePreferences({ ...activePreferences, subscriptions: newSubs });
  };

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
        specialties={activePreferences.specialties}
        isHome={currentView === 'home'}
        selectedCategory={selectedCategory}
        onSelectCategory={(cat) => {
          if (cat === '') { navigateHome(); }
          else { navigateToCategory(cat); }
          setSidebarOpen(false);
        }}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        onResetPreferences={() => setShowResetConfirm(true)}
        onOpenApiKeyModal={() => setShowApiKeyModal(true)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header */}
        <header className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 h-14 flex items-center px-4 shrink-0 justify-between transition-colors duration-200 relative z-20">
          <div className="flex items-center gap-2">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 hidden md:flex transition-colors">
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
              <Newspaper size={22} />
              <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">Paperstand</h1>
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

        {/* 모바일 분과 탭 — 전문과 뷰에서만 표시 */}
        {currentView === 'category' && selectedCategory !== 'Subscriptions' && (
          <CategoryTabs
            specialties={activePreferences.specialties}
            selectedCategory={selectedCategory}
            onSelectCategory={(cat) => navigateToCategory(cat)}
          />
        )}

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
          className="flex-1 overflow-y-auto p-6 pb-24 md:pb-8 md:p-8 relative z-10 bg-slate-50 dark:bg-slate-950 transition-transform duration-200"
          style={{ transform: `translateY(${pullDistance}px)` }}
        >
          <div className="max-w-4xl mx-auto">
            {currentView === 'home' ? (
              /* ── Home: independent multi-specialty newspaper feed ────────── */
              <HomeFeed
                specialties={activePreferences.specialties}
                homePapers={homePapers}
                homeLoading={homeLoading}
                readPaperIds={new Set(activePreferences.history.map(p => p.id))}
                onSelectPaper={handleOpenPaper}
                onSelectKeyword={setSelectedKeyword}
                onSeeMore={(specialty) => navigateToCategory(specialty)}
              />
            ) : (
              /* ── Subscriptions or Specialty category view ────────────────── */
              <>
                {/* Page heading */}
                <div className="mb-6">
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-3">
                    {selectedCategory === 'Subscriptions' ? '구독' : selectedCategory}
                    <button
                      onClick={handleRefresh}
                      disabled={loading || isStreaming}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors disabled:opacity-50"
                      title="새로운 논문 불러오기"
                    >
                      <RefreshCw size={20} className={loading || isStreaming ? 'animate-spin' : ''} />
                    </button>
                  </h2>

                  {/* Keyword filter badge */}
                  {selectedKeyword && (
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-sm text-slate-500 dark:text-slate-400">키워드 필터:</span>
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
                </div>

                {/* Suggestion / Recently published tabs (specialty view only) */}
                {selectedCategory !== 'Subscriptions' && (
                  <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl mb-6 w-fit">
                    {(['suggestion', 'new_journals'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setSelectedTab(tab)}
                        className={`px-5 py-2 text-sm font-medium rounded-lg transition-colors ${
                          selectedTab === tab
                            ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-700 dark:text-indigo-300'
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                        }`}
                      >
                        {tab === 'suggestion' ? 'Suggestion' : 'Recently published'}
                      </button>
                    ))}
                  </div>
                )}

                {/* Subscription keyword filters */}
                {selectedCategory === 'Subscriptions' && activePreferences.subscriptions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    <button
                      onClick={() => setSelectedKeyword(null)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        !selectedKeyword
                          ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      전체
                    </button>
                    {activePreferences.subscriptions.map(sub => (
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

                {/* Error state */}
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
                      {error.includes('API 키') && (
                        <button
                          onClick={() => setShowApiKeyModal(true)}
                          className="px-6 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-sm font-medium transition-colors w-full sm:w-auto"
                        >
                          API 키 설정하기
                        </button>
                      )}
                    </div>
                  </div>
                ) : selectedCategory === 'Subscriptions' && activePreferences.subscriptions.length === 0 ? (
                  /* Empty subscriptions */
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
                    readPaperIds={new Set(activePreferences.history.map(p => p.id))}
                  />
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <footer className="mt-12 pb-4 text-center text-xs text-slate-400 dark:text-slate-600 space-x-4">
            <span>© 2025 Paperstand</span>
            <button
              onClick={() => setShowPrivacyModal(true)}
              className="hover:text-slate-600 dark:hover:text-slate-400 transition-colors underline underline-offset-2"
            >
              개인정보처리방침
            </button>
            <a
              href="https://github.com/eski6230/Paperstand"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-600 dark:hover:text-slate-400 transition-colors"
            >
              GitHub
            </a>
          </footer>
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
          subscriptions={activePreferences.subscriptions}
          user={currentUser}
          onRequestLogin={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })}
          onSummarized={handleSummarized}
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

      <PrivacyPolicyModal isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} />

      {/* 모바일 바텀 네비게이션 */}
      <BottomNav
        isHome={currentView === 'home'}
        selectedCategory={selectedCategory}
        defaultSpecialty={lastSpecialtyRef.current || activePreferences.specialties[0] || ''}
        onNavigateHome={() => { navigateHome(); setSidebarOpen(false); }}
        onSelectCategory={(cat) => {
          navigateToCategory(cat);
          setSidebarOpen(false);
        }}
      />
    </div>
  );
}
