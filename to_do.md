# 작업 내용 기록

## 2025년 [현재 날짜]

### 완료된 작업
- data-collector API 분석
  - `/health`: 서비스 상태 확인 엔드포인트
  - `/metrics`: 성능 지표 제공 엔드포인트
  - `/collect`: 데이터 수집 트리거 엔드포인트 (realm_id 쿼리 파라미터 지원)
- Firebase 무료 티어 제한사항 검토
  - 저장 용량, 읽기/쓰기 작업, 네트워크 사용량 등 제한 확인
- 대안 솔루션 검토 (Supabase 등)
- 내부 DB 설정 결정

### 다음 할 일
- MongoDB 설치 및 구성
  - 사용자 계정 설정
  - 보안 설정 적용
  - 백업 전략 수립
- data-collector와 MongoDB 연동
  - 데이터 모델 설계
  - 데이터 저장 로직 구현
  - 연결 설정 및 테스트
- 데이터 마이그레이션 계획 (필요시)
  - Firebase에서 MongoDB로 데이터 이전 방법 검토
- 성능 테스트
  - 데이터 저장 및 조회 성능 측정
  - 부하 테스트
- 모니터링 설정
  - 데이터베이스 상태 모니터링
  - 디스크 공간 사용량 모니터링

## 프론트엔드 (Next.js) 개발 작업

### 현재까지 완료된 작업 (UI 기본 골격)
- 경매장 페이지 레이아웃 (`AuctionPageLayout.tsx`, `AuctionPage.tsx`) 생성
- 카테고리 사이드바 (`CategorySidebar.tsx`) 기본 UI 구현
- 아이템 검색 바 (`ItemSearchBar.tsx`) 기본 UI 구현
- 서버 필터 드롭다운 (`RealmFilterDropdown.tsx`) 기본 UI 구현
- 아이템 데이터 타입 (`AuctionItem`, `Currency`) 정의
- 화폐 표시 컴포넌트 (`CurrencyDisplay.tsx`) 구현
- 아이템 목록 행 컴포넌트 (`AuctionItemRow.tsx`) 구현
- 아이템 목록 테이블 컴포넌트 (`AuctionTable.tsx`) 및 Mock 데이터 연동

### 다음 할 일 (프론트엔드 기능 구현)
- **API 연동 및 데이터 표시:**
  - Next.js Route Handler (또는 API Route)를 사용하여 경매 데이터 조회 API 엔드포인트 생성 (`/api/auctions`).
    - MongoDB에서 데이터를 가져오는 로직 구현 (필터링, 검색, 정렬, 페이지네이션 파라미터 처리).
  - `AuctionPage.tsx`에서 위 API를 호출하여 실제 경매 데이터를 가져오고 상태로 관리.
  - 로딩 상태 및 오류 상태 처리 UI 구현.
  - `AuctionTable`에 실제 API 데이터를 전달하여 표시.
- **필터링 기능 구현:**
  - `CategorySidebar.tsx`: 카테고리 선택 시 해당 카테고리 아이템만 필터링하여 API 재요청.
  - `RealmFilterDropdown.tsx`: 서버 선택 시 해당 서버 아이템만 필터링하여 API 재요청.
  - (선택) 추가 필터 UI 및 로직 구현 (예: 아이템 레벨 범위, 가격 범위 등).
- **검색 기능 구현:**
  - `ItemSearchBar.tsx`: 아이템 이름 입력 시 실시간 또는 검색 버튼 클릭 시 해당 검색어로 API 재요청.
- **정렬 기능 구현:**
  - `AuctionTable.tsx`: 테이블 헤더 (아이템 이름, 가격 등) 클릭 시 해당 기준으로 오름차순/내림차순 정렬 API 재요청.
- **아이템 상세 정보 표시:**
  - `AuctionItemRow.tsx`에서 아이템 클릭 시 모달 창 표시.
  - 모달 컴포넌트 (`Modal.tsx`) 생성.
  - 가격 변동 그래프 컴포넌트 (`PriceHistoryChart.tsx`) 생성 및 API 연동 (아이템 ID 기반 최근 1주일 데이터).
  - 모달 내에 아이템 상세 정보 및 가격 변동 그래프 표시.
- **페이지네이션 구현:**
  - `AuctionTable` 하단에 페이지네이션 컴포넌트 (`Pagination.tsx`) 추가.
  - 페이지 변경 시 해당 페이지 데이터 API 재요청.
- **UI/UX 개선:**
  - `sampleui.png`를 참고하여 전체적인 디자인 디테일 향상 (아이콘, 색상, 폰트 등).
  - 반응형 디자인 개선.
  - 사용자 피드백 (로딩 스피너, 알림 등) 강화.
- **테스트 및 버그 수정.** 