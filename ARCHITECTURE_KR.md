# 아키텍처 및 폴더 구조 설계

## 1. 전체 아키텍처

```
[Blizzard API]
     │
     ▼
[data-collector (Python)]  # 데이터 수집 백엔드
     │
     ▼
[MongoDB (DB)]
     │
     ▼
[nextjs-app (Next.js)]     # 웹 프론트엔드
```

- **data-collector (Python)**: 주기적으로 Blizzard API를 호출해 MongoDB에 경매 데이터를 저장
  - 설정 가능한 간격으로 데이터 수집 (기본: 60분)
  - 모든 realm의 경매 데이터 수집 및 저장
  - 오래된 데이터 자동 정리 (기본: 7일)
  - 헬스체크 및 모니터링 엔드포인트 제공
  - 로깅 및 성능 통계 수집
  
- **nextjs-app (Next.js)**: MongoDB에서 데이터를 읽어와 사용자에게 웹 UI로 제공
  - 서버 및 아이템별 경매 데이터 조회 기능
  - 필터링 및 정렬 기능
  - 아이템 가격 변동 트렌드 시각화
  - 반응형 웹 디자인

## 2. 세부 아키텍처

### 2.1 데이터 수집기 (Python)

```
data-collector/
├── main.py               # 메인 애플리케이션 및 스케줄러
├── blizzard_api.py       # Blizzard API 통신 모듈
├── mongodb_client.py     # MongoDB 데이터 저장 모듈
├── logger_config.py      # 로깅 설정 관리
├── monitoring.py         # 성능 모니터링 및 통계
├── health_server.py      # 헬스체크 HTTP 서버
├── requirements.txt      # 의존성 패키지 목록
├── Dockerfile            # 도커 이미지 설정
├── README.md             # 사용 설명서
└── logs/                 # 로그 디렉토리
```

### 2.2 웹 프론트엔드 (Next.js)

```
nextjs-app/
├── app/                                  # Next.js App Router
│   ├── layout.tsx                        # 전역 레이아웃 (폰트, 기본 스타일 등)
│   ├── global.css                        # 전역 CSS
│   ├── auction/                          # 경매장 관련 페이지
│   │   ├── page.tsx                      # 경매장 메인 페이지 (데이터 페칭 및 상태 관리)
│   │   ├── layout.tsx                    # 경매장 페이지용 레이아웃 (사이드바, 컨텐츠 영역 구성)
│   │   └── (loading.tsx, error.tsx 등)   # Next.js 규칙 기반 파일들
│   └── ...
├── components/                           # UI 컴포넌트
│   ├── auction/                          # 경매장 페이지 전용 컴포넌트
│   │   ├── layout/
│   │   │   └── AuctionPageLayout.tsx     # 경매장 페이지 전체 레이아웃 컴포넌트 (상단 바, 좌측 카테고리, 중앙 목록)
│   │   ├── sidebar/
│   │   │   └── CategorySidebar.tsx       # 아이템 카테고리 목록 표시 (필터 기능)
│   │   ├── list/
│   │   │   ├── AuctionTable.tsx          # 경매 아이템 목록 테이블 (정렬 기능 포함)
│   │   │   └── AuctionItemRow.tsx        # 테이블의 각 아이템 행
│   │   ├── search/
│   │   │   └── ItemSearchBar.tsx         # 아이템 이름 검색창
│   │   ├── filter/
│   │   │   └── RealmFilterDropdown.tsx   # 서버(Realm) 선택 드롭다운
│   │   ├── chart/
│   │   │   └── PriceHistoryChart.tsx     # 아이템 가격 변동 그래프 (모달 또는 상세 영역에 표시)
│   │   └── common/                       # 경매장 내에서 사용되는 기타 공통 UI 요소
│   │       ├── CurrencyDisplay.tsx     # 골드, 실버, 코퍼 표시
│   │       └── Pagination.tsx          # 페이지네이션 컨트롤
│   ├── shared/                           # 여러 페이지에서 재사용될 수 있는 공통 컴포넌트
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── Modal.tsx
│   │   └── ...
│   └── ...
├── lib/                                  # 유틸리티, API 호출, 타입 정의 등
│   ├── mongodb.ts                        # MongoDB 클라이언트 설정 (재사용)
│   ├── api/                              # 백엔드 API 라우트 핸들러 (Next.js API Routes 또는 Route Handlers)
│   │   └── auctions.ts                 # 경매 데이터 조회 API (필터링, 정렬, 검색 로직 포함)
│   ├── hooks/                            # 커스텀 React Hooks (상태 관리, 데이터 페칭 등)
│   ├── types/                            # TypeScript 타입 정의 (아이템, 경매 데이터 등)
│   └── utils/                            # 기타 유틸리티 함수
├── public/                               # 정적 파일 (이미지, 폰트 등)
├── store/                                # 전역 상태 관리 (Zustand, Jotai, Redux 등 - 필요시 도입)
├── styles/                               # 전역 스타일 및 테마 관련 (선택적)
├── package.json                          # 프로젝트 의존성
├── tsconfig.json                         # TypeScript 설정
├── next.config.js                        # Next.js 설정
├── tailwind.config.ts                    # Tailwind CSS 설정 (사용한다면)
└── Dockerfile                            # Docker 이미지 빌드 설정
```

### 2.3 데이터 흐름

1. **데이터 수집 흐름**:
   ```
   Blizzard API -> data-collector (Python) -> MongoDB
   ```
   - 설정된 간격(기본 60분)마다 데이터 수집
   - Realm별 경매장 데이터 저장
   - 오래된 데이터 자동 정리

2. **데이터 조회 흐름**:
   ```
   사용자 요청 -> nextjs-app -> MongoDB -> 결과 표시
   ```
   - 실시간 경매 데이터 조회
   - 필터링 및 정렬 기능
   - 아이템 가격 추이 시각화

## 3. 배포 아키텍처

```
[GitHub]
   │
   ▼
[GitHub Actions] --- SSH ---> [Azure VM]
                              │
                              ▼
                      [Docker Compose]
                       ├── data-collector
                       └── nextjs-app
```

- **GitHub Actions**: CI/CD 파이프라인으로 코드 변경시 자동 배포
- **Azure VM**: 도커 컨테이너로 서비스 호스팅
- **Docker Compose**: 멀티 컨테이너 관리 및 환경 변수 설정 (MongoDB URI 등)

## 4. 도커 컨테이너 구성

```
┌─────────────────────────────┐     ┌─────────────────────────┐
│       data-collector        │     │       nextjs-app        │
│  ┌───────────────────────┐  │     │  ┌─────────────────┐    │
│  │ Python Application    │  │     │  │ Next.js Server  │    │
│  │                       │  │     │  │                 │    │
│  │ - Scheduler           │  │     │  │ - Web UI        │    │
│  │ - Blizzard API Client │  │     │  │ - Data Display  │    │
│  │ - MongoDB Client      │  │     │  │ - Interactions  │    │
│  │ - Health Server       │  │     │  │                 │    │
│  └───────────────────────┘  │     │  └─────────────────┘    │
│  Port: 8080 (Health Check)  │     │  Port: 3000 (Web UI)    │
└─────────────────────────────┘     └─────────────────────────┘
           │                                     │
           │                                     │
           ▼                                     ▼
   ┌───────────────────┐               ┌─────────────────┐
   │  Volume: ./logs   │               │     Users       │
   └───────────────────┘               └─────────────────┘
```

## 5. 장점

- **분리된 책임**: 데이터 수집과 웹 서비스가 독립적으로 동작
- **확장성**: 각 컴포넌트를 독립적으로 확장 가능
- **관리 용이성**: 도커 컴포즈를 통한 통합 관리
- **모니터링**: 헬스체크 및 성능 모니터링 기능
- **신뢰성**: 오류 복구 및 로깅 기능 내장
- **배포 자동화**: GitHub Actions를 통한 CI/CD 자동화

### 6. 경매장 기능 상세

#### 6.1 경매 아이템 목록 생성 프로세스

1. **데이터 수집 및 처리**
   - `/api/auctions/[realmId]` 엔드포인트에서 서버별 경매 데이터 조회
   - `AuctionItem` 인터페이스 기반 데이터 구조화 (아이템 ID, 이름, 품질, 아이콘 URL 등)
   - 동일 아이템 그룹화 및 최저가 기준 대표 아이템 선정

2. **화면 표시**
   - `AuctionTable` 컴포넌트를 통한 그리드 형태 목록 표시
   - 아이템별 아이콘, 이름, 품질, 최저가 정보 제공
   - 페이지네이션을 통한 대량 데이터 처리

#### 6.2 아이템 상세 정보 표시

1. **클릭 이벤트 처리**
   ```typescript
   const handleItemClick = async (item: AuctionItem) => {
     setSelectedItemForModal(item);
     setIsModalOpen(true);
     const detailedAuctions = await getItemAuctionsForModal(realmId, item.item.id);
     setAllAuctionsForSelectedItem(detailedAuctions);
   };
   ```

2. **상세 정보 모달**
   - 아이템 기본 정보 (아이콘, 이름, 품질 등)
   - 품질 등급별 차별화된 색상 표시
   - 현재 등록된 전체 경매 목록
   - 가격별 그룹화된 경매 정보 표시

#### 6.3 주요 기능 및 최적화

1. **데이터 관리**
   - 실시간 데이터 업데이트 (`no-store` 캐시 옵션)
   - 에러 처리 및 로딩 상태 표시
   - 반응형 디자인 지원

2. **사용자 경험**
   - 아이템 이름 기반 검색 기능
   - 가격, 수량 기반 필터링
   - 실시간 가격 정보 모니터링

3. **성능 최적화**
   - `useMemo`를 통한 아이템 그룹화 최적화
   - 이미지 로드 에러 처리
   - 컴포넌트 분리를 통한 렌더링 최적화
   - 데이터 캐싱 및 페이지네이션

4. **데이터 구조**
   ```typescript
   interface AuctionResponse {
     status: string;
     total_count: number;
     auctions: AuctionItem[];
     cache_status: string;
   }

   interface AuctionsByItemResponse {
     status: string;
     realm_id: number | string;
     item_id: number;
     auctions: IndividualAuction[];
     count: number;
   }
   ```