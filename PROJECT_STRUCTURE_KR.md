# 프로젝트 구조 분석

---

## 1. 최상위 디렉토리 및 파일
- **README.md, Dockerfile, package.json, tsconfig.json, yarn.lock, package-lock.json** 등: 프로젝트 설정, 의존성, 빌드, 문서 관련 파일
- **eslint.config.mjs, postcss.config.mjs, next.config.ts**: 린트, 스타일, Next.js 설정 파일
- **firestore.rules, FIREBASE_SECURITY_RULES.md, FIREBASE_AUTH_GUIDE.md, FIREBASE_FUNCTIONS_GUIDE.md, firebase-functions-plan.md**: 파이어베이스 및 보안 관련 문서와 규칙 파일

---

## 2. 주요 폴더 구조

### (1) `app/`
- **Next.js의 app 디렉토리 기반 라우팅 구조**
- 주요 하위 폴더:
  - **components/**: 재사용 가능한 리액트 컴포넌트 모음
  - **api/**: 서버리스 API 라우트(여러 기능별 하위 폴더 존재)
  - **lib/**: 파이어베이스 및 파이어스토어 관련 유틸리티/서비스 코드
  - **auth/**: 인증 관련 페이지
  - **iteminfo/**: 아이템 정보 관련 JSON 데이터 파일 다수
  - **oauth/**: OAuth 관련 기능(상세 미확인)
- **page.tsx, layout.tsx, globals.css, favicon.ico** 등: 루트 페이지, 레이아웃, 전역 스타일, 파비콘

### (2) `public/`
- 정적 파일(이미지, SVG 등) 저장

### (3) `.github/`, `.git/`, `node_modules/`, `.next/`
- 각각 깃헙 워크플로우, 깃 저장소, 의존성, Next.js 빌드 산출물 등

---

## 3. 세부 폴더 예시

### `app/components/`
- **AuthComponent.tsx, Auctions.tsx, ItemSearch.tsx** 등: 인증, 경매, 아이템 검색 등 다양한 UI 컴포넌트
- **.bak, .new** 확장자 파일: 백업 또는 실험적 코드로 추정

### `app/api/`
- **check-auth, firestore-stats, firestore-auctions, item-classes, items, connected-realm, auctions, hello** 등: 다양한 기능별 API 엔드포인트

### `app/lib/`
- **firebase.ts, firebase-admin.ts, firestoreService.ts**: 파이어베이스 초기화, 어드민, 파이어스토어 서비스 함수

### `app/iteminfo/`
- **여러 개의 .json 파일**: 아이템별 상세 데이터(아이템 ID별로 저장)

---

## 4. 기타
- **보안 및 인증, 파이어베이스 연동, 경매/아이템 정보 제공** 등 게임 관련 데이터 서비스로 추정
- **Next.js + TypeScript + Firebase** 조합의 웹 프로젝트

---

> 추가로 궁금한 특정 폴더/파일이나, 더 깊은 분석이 필요한 부분이 있으면 말씀해 주세요! 