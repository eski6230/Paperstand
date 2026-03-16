import { useRef, useEffect } from 'react';
import { SPECIALTIES } from '../constants';

const SHORT_LABELS: Record<string, string> = {
  "Gastrointestinology": "GI",
  "Hepatology": "Hepatology",
  "Cardiology": "Cardiology",
  "Pulmonology & Critical care medicine": "Pulm/CCM",
  "Endocrinology": "Endo",
  "Nephrology": "Nephrology",
  "Hematology": "Hematology",
  "Oncology": "Oncology",
  "Infectious disease": "ID",
  "Allergy & Immunology": "Allergy",
  "Rheumatology": "Rheum",
  "Neurology & Neurosurgery": "Neuro",
  "Medical AI": "Medical AI",
};

interface CategoryTabsProps {
  specialties: string[];          // 유저의 선택 분과 (먼저 표시)
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export default function CategoryTabs({ specialties, selectedCategory, onSelectCategory }: CategoryTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  const others = SPECIALTIES.filter(s => !specialties.includes(s));
  const allTabs = [...specialties, ...others];

  // 선택된 탭이 보이도록 스크롤 보정
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const el = activeRef.current;
      const containerLeft = container.scrollLeft;
      const containerRight = containerLeft + container.clientWidth;
      const elLeft = el.offsetLeft;
      const elRight = elLeft + el.offsetWidth;

      if (elLeft < containerLeft) {
        container.scrollTo({ left: elLeft - 12, behavior: 'smooth' });
      } else if (elRight > containerRight) {
        container.scrollTo({ left: elRight - container.clientWidth + 12, behavior: 'smooth' });
      }
    }
  }, [selectedCategory]);

  return (
    <div className="md:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0">
      <div
        ref={scrollRef}
        className="flex overflow-x-auto px-3 py-2 gap-1.5"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
      >
        {allTabs.map((cat) => {
          const isActive = selectedCategory === cat;
          const label = SHORT_LABELS[cat] ?? cat;
          const isUserPref = specialties.includes(cat);
          return (
            <button
              key={cat}
              ref={isActive ? activeRef : null}
              onClick={() => onSelectCategory(cat)}
              className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : isUserPref
                  ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
