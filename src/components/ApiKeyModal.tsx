import React, { useState, useEffect } from 'react';
import { Key, X } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

export default function ApiKeyModal({ isOpen, onClose, onSave }: ApiKeyModalProps) {
  const [hasPersonalKey, setHasPersonalKey] = useState(false);
  const [manualKey, setManualKey] = useState(() => localStorage.getItem('custom_gemini_api_key') || '');
  const [showKeyInput, setShowKeyInput] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    
    const checkKey = () => {
      setHasPersonalKey(!!localStorage.getItem('custom_gemini_api_key'));
    };
    checkKey();
  }, [isOpen]);

  const handleSaveManualKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualKey.trim()) {
      localStorage.setItem('custom_gemini_api_key', manualKey.trim());
      setHasPersonalKey(true);
      setShowKeyInput(false);
      alert("API 키가 저장되었습니다.");
      if (onSave) {
        onSave();
      } else {
        onClose();
      }
    } else {
      localStorage.removeItem('custom_gemini_api_key');
      setHasPersonalKey(false);
      alert("API 키가 삭제되었습니다.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Key size={20} />
            <h2 className="font-bold text-slate-900 dark:text-white">API Key Settings</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Current Status</span>
            <span className={`text-xs font-bold px-2 py-1 rounded ${hasPersonalKey ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'}`}>
              {hasPersonalKey ? 'API Key Active' : 'API Key Required'}
            </span>
          </div>
          
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
            {hasPersonalKey 
              ? '개인 API 키가 정상적으로 등록되었습니다. 서비스를 자유롭게 이용하실 수 있습니다.' 
              : '서비스를 이용하려면 Google Gemini API 키 등록이 필요합니다. 아래 안내에 따라 키를 발급받아 입력해주세요.'}
          </p>
          
          <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">API 키 발급 방법</h3>
              <ol className="text-xs text-slate-500 dark:text-slate-400 space-y-2 list-decimal list-inside">
                <li>
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                  >
                    Google AI Studio
                  </a>
                  에 접속합니다.
                </li>
                <li>'Get API key' 버튼을 클릭합니다.</li>
                <li>'Create API key'를 눌러 키를 생성하고 복사합니다.</li>
                <li>아래 입력창에 복사한 키를 붙여넣고 저장합니다.</li>
              </ol>
            </div>

            <form onSubmit={handleSaveManualKey} className="space-y-3">
              <input 
                type="password"
                value={manualKey}
                onChange={(e) => setManualKey(e.target.value)}
                placeholder="Gemini API Key 입력 (AIza...)"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500 dark:text-white"
              />
              <button 
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg transition-colors shadow-sm"
              >
                {hasPersonalKey ? 'API 키 업데이트' : 'API 키 저장하기'}
              </button>
              {hasPersonalKey && (
                <button 
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('custom_gemini_api_key');
                    setManualKey('');
                    setHasPersonalKey(false);
                    alert("API 키가 삭제되었습니다. 기본 키를 사용합니다.");
                  }}
                  className="w-full py-2 text-xs text-slate-400 hover:text-rose-500 transition-colors"
                >
                  개인 API 키 삭제하고 기본값 사용
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
