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
├── app/                  # Next.js App Router
│   ├── layout.tsx        # 전체 레이아웃
│   ├── page.tsx          # 메인 페이지
│   ├── [realm]/          # 서버별 페이지
│   └── ...
├── components/           # 리액트 컴포넌트
│   ├── AuctionList.tsx   # 경매 목록 컴포넌트
│   ├── ItemDetail.tsx    # 아이템 상세 정보 컴포넌트
│   ├── PriceChart.tsx    # 가격 변동 차트 컴포넌트
│   └── ...
├── lib/                  # 유틸리티 및 공통 코드
│   ├── mongodb.ts        # MongoDB 연결 설정
│   ├── auctions.ts       # 경매 데이터 조회 함수
│   └── ...
├── public/               # 정적 파일
├── package.json          # 의존성 정의
├── tailwind.config.ts    # Tailwind CSS 설정
└── Dockerfile            # 도커 이미지 설정
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

#