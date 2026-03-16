# Paperstand

AI 기반 내과 의사를 위한 의학 논문 큐레이션 플랫폼입니다.

## 주요 기능

- 내과 13개 전공별 최신 논문 큐레이션
- PubMed 연동으로 실제 존재하는 논문만 제공
- 한국어 요약 및 핵심 임상 포인트 제공
- 논문 상세 요약 및 AI 질문 기능
- 관련 논문 및 리뷰 논문 연결
- 구독 키워드 기반 맞춤 피드
- 관심도 기반 알고리즘 (신문처럼 다양성 유지)

## 시작하기

### 필요 사항
- Node.js
- Google Gemini API 키 ([발급받기](https://aistudio.google.com/app/apikey))

### 로컬 실행

1. 패키지 설치:
   `npm install`

2. 앱 실행:
   `npm run dev`

3. 브라우저에서 `http://localhost:3000` 접속 후 API 키 입력

### 배포

Vercel을 통해 배포합니다. API 키는 사용자가 앱에서 직접 입력하며, 코드에 포함되지 않습니다.
