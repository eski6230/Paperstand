import { useState, useRef, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { LogIn, LogOut, ChevronDown, User as UserIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AuthButtonProps {
  user: User | null;
  onAuthChange: (user: User | null) => void;
}

export default function AuthButton({ user, onAuthChange }: AuthButtonProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
    } catch (err) {
      console.error('Sign in error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsMenuOpen(false);
    await supabase.auth.signOut();
    onAuthChange(null);
  };

  if (!user) {
    return (
      <button
        onClick={handleSignIn}
        disabled={isLoading}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
      >
        <LogIn size={15} />
        <span>로그인</span>
      </button>
    );
  }

  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || '사용자';
  const avatarUrl = user.user_metadata?.avatar_url;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors border ${
          isMenuOpen
            ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600'
            : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
        }`}
        title="계정 메뉴"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName} className="w-7 h-7 rounded-full object-cover ring-2 ring-indigo-400/60" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold ring-2 ring-indigo-400/60">
            {displayName[0].toUpperCase()}
          </div>
        )}
        <span className="hidden sm:inline text-sm font-medium text-slate-700 dark:text-slate-200 max-w-[100px] truncate">
          {displayName}
        </span>
        <ChevronDown
          size={14}
          className={`text-slate-400 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isMenuOpen && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-600 py-1 z-50 overflow-hidden">
          {/* 유저 정보 */}
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-600 flex items-center gap-3">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="w-8 h-8 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                {displayName[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{displayName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
            </div>
          </div>

          {/* 프로필 메뉴 아이템 */}
          <div className="py-1">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
            >
              <LogOut size={15} />
              로그아웃
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
