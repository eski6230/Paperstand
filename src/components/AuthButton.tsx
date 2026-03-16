import { useState, useRef, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { LogIn, LogOut, ChevronDown } from 'lucide-react';
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
        options: {
          redirectTo: window.location.origin,
        },
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
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors disabled:opacity-50"
      >
        <LogIn size={16} />
        <span className="hidden sm:inline">로그인</span>
      </button>
    );
  }

  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || '사용자';
  const avatarUrl = user.user_metadata?.avatar_url;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName} className="w-7 h-7 rounded-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
            {displayName[0].toUpperCase()}
          </div>
        )}
        <span className="hidden sm:inline text-sm font-medium text-slate-700 dark:text-slate-300 max-w-[100px] truncate">
          {displayName}
        </span>
        <ChevronDown size={14} className="text-slate-400" />
      </button>

      {isMenuOpen && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-50">
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
          >
            <LogOut size={15} />
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}
