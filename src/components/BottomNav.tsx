import { Newspaper, Bookmark, LayoutGrid } from 'lucide-react';

interface BottomNavProps {
  isHome: boolean;                              // true when Home view is active
  selectedCategory: string;                    // only meaningful in category view
  defaultSpecialty: string;                    // last/first specialty for "전문과" tap
  onNavigateHome: () => void;
  onSelectCategory: (category: string) => void;
}

export default function BottomNav({
  isHome,
  selectedCategory,
  defaultSpecialty,
  onNavigateHome,
  onSelectCategory,
}: BottomNavProps) {
  // Active state is derived from isHome + selectedCategory — never coupled to empty string
  const isSubscriptionsActive = !isHome && selectedCategory === 'Subscriptions';
  const isSpecialtyActive = !isHome && selectedCategory !== 'Subscriptions';

  const tabs = [
    {
      id:     'home',
      label:  '홈',
      icon:   Newspaper,
      active: isHome,
      onTap:  onNavigateHome,
    },
    {
      id:     'subscriptions',
      label:  '구독',
      icon:   Bookmark,
      active: isSubscriptionsActive,
      onTap:  () => onSelectCategory('Subscriptions'),
    },
    {
      id:     'specialties',
      label:  '전문과',
      icon:   LayoutGrid,
      active: isSpecialtyActive,
      onTap:  () => onSelectCategory(defaultSpecialty),
    },
  ] as const;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 safe-area-inset-bottom">
      <div className="flex items-stretch h-16">
        {tabs.map(({ id, label, icon: Icon, active, onTap }) => (
          <button
            key={id}
            onClick={onTap}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${
              active
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <div className={`relative p-1 rounded-lg transition-colors ${
              active ? 'bg-indigo-50 dark:bg-indigo-500/15' : ''
            }`}>
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              {active && (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-600 dark:bg-indigo-400" />
              )}
            </div>
            <span className={`text-[10px] leading-none ${active ? 'font-bold' : 'font-medium'}`}>
              {label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
