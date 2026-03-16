import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function PrivacyPolicyModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="relative w-full max-w-2xl max-h-[85vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">개인정보처리방침</h2>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="overflow-y-auto p-6 space-y-6 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <p className="text-xs text-slate-400 dark:text-slate-500">최종 업데이트: 2025년 3월</p>

            <section>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-2">1. 서비스 개요</h3>
              <p>
                Paperstand(이하 "서비스")는 의료 전문가를 위한 AI 기반 의학 논문 큐레이션 플랫폼입니다.
                본 방침은 서비스 이용 과정에서 수집되는 정보의 처리 방식을 설명합니다.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-2">2. 수집하는 정보</h3>
              <ul className="space-y-1 list-disc list-inside text-slate-600 dark:text-slate-400">
                <li><strong>Google 계정 정보</strong>: 소셜 로그인 시 이름, 이메일, 프로필 사진 (Google OAuth)</li>
                <li><strong>사용 데이터</strong>: 관심 분과, 논문 열람 기록, 투표 및 댓글 내용</li>
                <li><strong>기기 정보</strong>: 브라우저 종류, 기기 유형 (서비스 개선 목적)</li>
                <li><strong>로컬 저장소</strong>: 사용자 설정 및 캐시 (브라우저 localStorage)</li>
              </ul>
            </section>

            <section>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-2">3. 정보 이용 목적</h3>
              <ul className="space-y-1 list-disc list-inside text-slate-600 dark:text-slate-400">
                <li>개인화된 논문 추천 알고리즘 제공</li>
                <li>소셜 기능(투표, 댓글) 운영</li>
                <li>서비스 품질 개선 및 분석</li>
                <li>Google AdSense를 통한 광고 표시</li>
              </ul>
            </section>

            <section>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-2">4. 제3자 서비스</h3>
              <p className="mb-2">서비스는 다음 제3자 플랫폼을 사용합니다:</p>
              <ul className="space-y-1 list-disc list-inside text-slate-600 dark:text-slate-400">
                <li><strong>Supabase</strong>: 데이터베이스 및 인증 (미국 서버)</li>
                <li><strong>Google Gemini API</strong>: AI 논문 요약 생성</li>
                <li><strong>PubMed (NCBI)</strong>: 의학 논문 데이터 조회</li>
                <li><strong>Google AdSense</strong>: 광고 서비스 (쿠키 사용 가능)</li>
                <li><strong>Cloudflare Pages</strong>: 웹 호스팅</li>
              </ul>
            </section>

            <section>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-2">5. 쿠키 및 추적</h3>
              <p>
                서비스는 로그인 세션 유지 및 Google AdSense 광고 개인화를 위해 쿠키를 사용할 수 있습니다.
                브라우저 설정에서 쿠키를 비활성화할 수 있으나, 일부 기능이 제한될 수 있습니다.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-2">6. 데이터 보관 및 삭제</h3>
              <p>
                수집된 데이터는 서비스 제공에 필요한 기간 동안 보관됩니다.
                계정 삭제를 원하시면 서비스 내 설정 메뉴를 이용하거나 문의해 주세요.
                로컬 데이터는 브라우저 캐시 초기화로 직접 삭제할 수 있습니다.
              </p>
            </section>

            <section>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-2">7. 미성년자</h3>
              <p>본 서비스는 의료 전문가를 대상으로 하며, 만 18세 미만의 사용자는 서비스 이용을 권장하지 않습니다.</p>
            </section>

            <section>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-2">8. 문의</h3>
              <p>
                개인정보 관련 문의사항이 있으시면 GitHub 저장소의 Issues를 통해 연락해 주세요.
              </p>
            </section>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs text-slate-400 dark:text-slate-500">
                본 방침은 서비스 변경에 따라 업데이트될 수 있으며, 중요한 변경 시 서비스 내 공지를 통해 알려드립니다.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
