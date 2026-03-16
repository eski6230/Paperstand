import React from 'react';
import { 
  BookOpen, ChevronRight, Settings, Bookmark, History, User,
  Waves, Activity, Heart, Wind, Droplet, Filter, TestTube, Target, Bug, Shield, Bone, Cpu, MoreHorizontal, Brain
} from 'lucide-react';
import { SPECIALTIES } from '../constants';

const SPECIALTY_ICONS: Record<string, any> = {
  "Gastrointestinology": Waves,
  "Hepatology": Activity,
  "Cardiology": Heart,
  "Pulmonology & Critical care medicine": Wind,
  "Endocrinology": Droplet,
  "Nephrology": Filter,
  "Hematology": TestTube,
  "Oncology": Target,
  "Infectious disease": Bug,
  "Allergy & Immunology": Shield,
  "Rheumatology": Bone,
  "Neurology & Neurosurgery": Brain,
  "Medical AI": Cpu
};

interface SidebarProps {
  specialties: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onResetPreferences: () => void;
  onOpenApiKeyModal: () => void;
}

export default function Sidebar({ specialties, selectedCategory, onSelectCategory, isOpen, setIsOpen, onResetPreferences, onOpenApiKeyModal }: SidebarProps) {
  const unselectedSpecialties = SPECIALTIES.filter(s => !specialties.includes(s));

  const handleSelect = (category: string) => {
    onSelectCategory(category);
    if (window.innerWidth < 768) setIsOpen(false);
  };

  const NavButton = ({ id, icon: Icon, label }: { id: string, icon: any, label: string }) => (
    <button
      onClick={() => handleSelect(id)}
      className={`
        w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors
        ${selectedCategory === id 
          ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300' 
          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'}
      `}
    >
      <Icon size={18} />
      <span className="truncate flex-1 text-left">{label}</span>
      {selectedCategory === id && <ChevronRight size={16} />}
    </button>
  );

  const CategoryButton = ({ category }: { category: string }) => {
    const Icon = SPECIALTY_ICONS[category] || MoreHorizontal;
    return (
      <button
        onClick={() => handleSelect(category)}
        className={`
          w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-colors
          ${selectedCategory === category 
            ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300' 
            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'}
        `}
      >
        <div className="flex items-center gap-3 truncate">
          <Icon size={18} className={selectedCategory === category ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'} />
          <span className="truncate">{category}</span>
        </div>
        {selectedCategory === category && <ChevronRight size={16} />}
      </button>
    );
  };

  return (
    <div className={`
      fixed inset-y-0 left-0 z-30 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-200 ease-in-out
      md:relative md:translate-x-0 flex flex-col
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    `}>
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 shrink-0 flex items-center justify-between">
        <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Menu</h2>
        <button 
          onClick={onResetPreferences}
          className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          title="관심사 재설정"
        >
          <Settings size={16} />
        </button>
      </div>
      
      <div className="p-4 overflow-y-auto flex-1 space-y-6">
        <nav className="space-y-1">
          <NavButton id="Subscriptions" icon={Bookmark} label="Subscriptions" />
          <NavButton id="History" icon={History} label="History" />
          <NavButton id="My Interest" icon={User} label="My Interest" />
        </nav>

        <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
          <h2 className="px-3 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">My Preferences</h2>
          <nav className="space-y-1">
            {specialties.map((category) => (
              <CategoryButton key={category} category={category} />
            ))}
          </nav>
        </div>

        {unselectedSpecialties.length > 0 && (
          <div>
            <h2 className="px-3 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Specialties</h2>
            <nav className="space-y-1">
              {unselectedSpecialties.map((category) => (
                <CategoryButton key={category} category={category} />
              ))}
            </nav>
          </div>
        )}
      </div>

      <div className="p-6 mt-auto shrink-0 border-t border-slate-100 dark:border-slate-800 space-y-4">
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-2">
            <BookOpen size={18} />
            <span className="font-semibold text-sm">How it works</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            개인화된 알고리즘으로 AI 추천 저널 큐레이션을 제공하거나, 최신 논문을 소개합니다.
          </p>
        </div>
        
        <button
          onClick={onOpenApiKeyModal}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800/30 dark:hover:bg-indigo-500/10 rounded-lg transition-colors border border-slate-100 dark:border-slate-800"
        >
          <Settings size={14} />
          개인 API 키 설정
        </button>
      </div>
    </div>
  );
}
