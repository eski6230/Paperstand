import React from 'react';
import {
  BookOpen, ChevronRight, Settings, Bookmark, Newspaper, LayoutGrid,
  Waves, Activity, Heart, Wind, Droplet, Filter, TestTube, Target,
  Bug, Shield, Bone, Cpu, MoreHorizontal, Brain,
} from 'lucide-react';
import { SPECIALTIES } from '../constants';

// ─── Specialty icons ───────────────────────────────────────────────────────────

const SPECIALTY_ICONS: Record<string, React.ElementType> = {
  "Gastrointestinology":                Waves,
  "Hepatology":                         Activity,
  "Cardiology":                         Heart,
  "Pulmonology & Critical care medicine": Wind,
  "Endocrinology":                      Droplet,
  "Nephrology":                         Filter,
  "Hematology":                         TestTube,
  "Oncology":                           Target,
  "Infectious disease":                 Bug,
  "Allergy & Immunology":              Shield,
  "Rheumatology":                       Bone,
  "Neurology & Neurosurgery":           Brain,
  "Medical AI":                         Cpu,
};

// ─── Props ─────────────────────────────────────────────────────────────────────

interface SidebarProps {
  specialties: string[];           // user's preferred specialties (shown first)
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onResetPreferences: () => void;
  onOpenApiKeyModal: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function Sidebar({
  specialties,
  selectedCategory,
  onSelectCategory,
  isOpen,
  setIsOpen,
  onResetPreferences,
  onOpenApiKeyModal,
}: SidebarProps) {
  const handleSelect = (category: string) => {
    onSelectCategory(category);
    if (window.innerWidth < 768) setIsOpen(false);
  };

  // All specialties: user's first, then the rest
  const otherSpecialties = SPECIALTIES.filter(s => !specialties.includes(s));
  const allSpecialties = [...specialties, ...otherSpecialties];

  // ── Reusable nav button ──────────────────────────────────────────────────────
  const NavButton = ({
    id,
    icon: Icon,
    label,
    badge,
  }: {
    id: string;
    icon: React.ElementType;
    label: string;
    badge?: number;
  }) => {
    const active = selectedCategory === id;
    return (
      <button
        onClick={() => handleSelect(id)}
        className={`
          w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors
          ${active
            ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'}
        `}
      >
        <Icon size={18} className={active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'} />
        <span className="truncate flex-1 text-left">{label}</span>
        {badge !== undefined && badge > 0 && (
          <span className="text-[10px] font-bold bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 px-1.5 py-0.5 rounded-full">
            {badge}
          </span>
        )}
        {active && <ChevronRight size={16} />}
      </button>
    );
  };

  // ── Specialty button ─────────────────────────────────────────────────────────
  const SpecialtyButton = ({ category }: { category: string }) => {
    const Icon = SPECIALTY_ICONS[category] || MoreHorizontal;
    const active = selectedCategory === category;
    const isPref = specialties.includes(category);
    return (
      <button
        onClick={() => handleSelect(category)}
        className={`
          w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors
          ${active
            ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'}
        `}
      >
        <Icon
          size={16}
          className={active ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}
        />
        <span className="truncate flex-1 text-left">{category}</span>
        {isPref && !active && (
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500 shrink-0" />
        )}
        {active && <ChevronRight size={14} />}
      </button>
    );
  };

  return (
    <div className={`
      fixed inset-y-0 left-0 z-30 w-72 bg-white dark:bg-slate-900
      border-r border-slate-200 dark:border-slate-800
      transform transition-transform duration-200 ease-in-out
      md:relative md:translate-x-0 flex flex-col
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    `}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-800 shrink-0 flex items-center justify-between">
        <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          Navigation
        </h2>
        <button
          onClick={onResetPreferences}
          className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          title="설정"
        >
          <Settings size={16} />
        </button>
      </div>

      {/* ── Nav content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">

        {/* ── Section 1: Main navigation ──────────────────────────────────── */}
        <nav className="space-y-0.5">
          <NavButton id=""             icon={Newspaper} label="Home" />
          <NavButton id="Subscriptions" icon={Bookmark}  label="Subscriptions" />
        </nav>

        {/* ── Section 2: By Specialties ───────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 px-3 mb-2">
            <LayoutGrid size={12} className="text-slate-400 dark:text-slate-500" />
            <h3 className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              By Specialties
            </h3>
          </div>
          <nav className="space-y-0.5">
            {allSpecialties.map(cat => (
              <SpecialtyButton key={cat} category={cat} />
            ))}
          </nav>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <div className="p-5 shrink-0 border-t border-slate-100 dark:border-slate-800 space-y-3">
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3.5 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-1.5">
            <BookOpen size={15} />
            <span className="font-semibold text-xs">How it works</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            AI가 PubMed 최신 논문을 분과별로 큐레이션합니다.
          </p>
        </div>

        <button
          onClick={onOpenApiKeyModal}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium
                     text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400
                     bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800/30 dark:hover:bg-indigo-500/10
                     rounded-lg transition-colors border border-slate-100 dark:border-slate-800"
        >
          <Settings size={13} />
          개인 API 키 설정
        </button>
      </div>
    </div>
  );
}
