import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SPECIALTIES, SUB_TOPICS, JOURNALS } from '../constants';
import { UserPreferences } from '../types';
import { ChevronRight, ChevronLeft, Check, Newspaper, Plus } from 'lucide-react';

interface OnboardingProps {
  onComplete: (preferences: UserPreferences) => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [subTopics, setSubTopics] = useState<Record<string, string[]>>({});
  const [journals, setJournals] = useState<string[]>([]);
  const [customTopic, setCustomTopic] = useState("");

  const toggleSpecialty = (sp: string) => {
    setSpecialties(prev => {
      if (prev.includes(sp)) return prev.filter(s => s !== sp);
      if (prev.length >= 5) return prev; // Max 5
      return [...prev, sp];
    });
  };

  const toggleSubTopic = (sp: string, topic: string) => {
    setSubTopics(prev => {
      const current = prev[sp] || [];
      const updated = current.includes(topic)
        ? current.filter(t => t !== topic)
        : [...current, topic];
      return { ...prev, [sp]: updated };
    });
  };

  const handleAddCustomTopic = () => {
    if (!customTopic.trim()) return;
    setSubTopics(prev => {
      const current = prev["Others"] || [];
      if (current.includes(customTopic.trim())) return prev;
      return { ...prev, "Others": [...current, customTopic.trim()] };
    });
    setCustomTopic("");
  };

  const toggleJournal = (journal: string) => {
    setJournals(prev => 
      prev.includes(journal) ? prev.filter(j => j !== journal) : [...prev, journal]
    );
  };

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
    else onComplete({ 
      specialties, 
      subTopics, 
      journals,
      subscriptions: [],
      history: [],
      topicWeights: {}
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="bg-indigo-600 p-8 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-500/20 to-purple-600/20 opacity-50 mix-blend-overlay"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm mb-4">
              <Newspaper size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold mb-2">맞춤형 논문 큐레이션 설정</h1>
            <p className="text-indigo-100 text-sm">
              선생님의 관심사에 맞춰 가장 연관성 높은 최신 논문을 선별해 드립니다.
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex bg-slate-100 h-1.5">
          <div 
            className="bg-indigo-500 h-full transition-all duration-500 ease-out"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-8 min-h-[400px]">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-1">관심 분과를 선택해주세요</h2>
                  <p className="text-sm text-slate-500">최대 5개까지 선택 가능합니다. ({specialties.length}/5)</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {SPECIALTIES.map(sp => {
                    const isSelected = specialties.includes(sp);
                    return (
                      <button
                        key={sp}
                        onClick={() => toggleSpecialty(sp)}
                        disabled={!isSelected && specialties.length >= 5}
                        className={`
                          p-3 rounded-xl text-sm font-medium transition-all text-left flex items-center justify-between
                          ${isSelected 
                            ? 'bg-indigo-50 border-2 border-indigo-500 text-indigo-700' 
                            : 'bg-white border-2 border-slate-100 text-slate-600 hover:border-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed'}
                        `}
                      >
                        <span className="truncate pr-2">{sp}</span>
                        {isSelected && <Check size={16} className="shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-1">세부 관심 주제를 선택해주세요</h2>
                  <p className="text-sm text-slate-500">선택하신 분과별로 더 집중해서 보고 싶은 주제를 골라주세요.</p>
                </div>
                <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-2">
                  {specialties.map(sp => (
                    <div key={sp} className="space-y-3">
                      <h3 className="text-sm font-bold text-slate-700 border-b border-slate-100 pb-2">{sp}</h3>
                      
                      {sp === "Others" && (
                        <div className="flex gap-2 mb-3">
                          <input 
                            type="text" 
                            value={customTopic}
                            onChange={(e) => setCustomTopic(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddCustomTopic()}
                            placeholder="원하시는 주제를 직접 입력하세요" 
                            className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                          />
                          <button 
                            onClick={handleAddCustomTopic}
                            className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors flex items-center"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {(SUB_TOPICS[sp] || subTopics[sp] || []).map(topic => {
                          const isSelected = subTopics[sp]?.includes(topic);
                          return (
                            <button
                              key={topic}
                              onClick={() => toggleSubTopic(sp, topic)}
                              className={`
                                px-3 py-1.5 rounded-full text-xs font-medium transition-colors
                                ${isSelected 
                                  ? 'bg-indigo-600 text-white shadow-sm' 
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}
                              `}
                            >
                              {topic}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-1">선호하는 저널이 있으신가요?</h2>
                  <p className="text-sm text-slate-500">선택하신 저널의 논문을 우선적으로 큐레이션 합니다. (선택사항)</p>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {JOURNALS.map(journal => {
                    const isSelected = journals.includes(journal);
                    return (
                      <button
                        key={journal}
                        onClick={() => toggleJournal(journal)}
                        className={`
                          px-4 py-2 rounded-lg text-sm font-medium transition-all border-2
                          ${isSelected 
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700' 
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}
                        `}
                      >
                        {journal}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            onClick={() => setStep(step - 1)}
            disabled={step === 1}
            className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 disabled:opacity-0 transition-colors flex items-center gap-1"
          >
            <ChevronLeft size={16} /> 이전
          </button>
          <button
            onClick={handleNext}
            disabled={step === 1 && specialties.length === 0}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {step === 3 ? '완료 및 시작하기' : '다음 단계'}
            {step < 3 && <ChevronRight size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
