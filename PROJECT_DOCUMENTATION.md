# WoW 경매장 데이터 수집 및 분석 시스템

## 1. 프로젝트 개요

### 1.1 목적
- World of Warcraft 게임의 경매장 데이터를 실시간으로 수집하고 분석
- 사용자에게 경매 아이템의 가격 정보와 트렌드를 제공
- 효율적인 거래를 위한 정보 제공 플랫폼 구축

### 1.2 주요 기능
- 실시간 경매 데이터 수집 및 저장
- 서버별, 아이템별 경매 정보 조회
- 아이템 가격 추이 분석
- 사용자 친화적인 웹 인터페이스

## 2. 시스템 아키텍처

### 2.1 전체 구조
```
[Blizzard API] → [Data Collector] → [MongoDB] → [Next.js Frontend] → [Users]
                        ↑                             ↑
                  [Server Admin] ------------------- [API]
```

### 2.2 컴포넌트 구성
1. **Data Collector (Python)**
   - Blizzard API 데이터 수집
   - 주기적 데이터 업데이트 (60분 간격)
   - 데이터 정제 및 저장

2. **Next.js Frontend**
   - 사용자 인터페이스 제공
   - 실시간 데이터 조회 및 표시
   - 반응형 웹 디자인

3. **Server Admin**
   - 시스템 모니터링
   - 서버 상태 관리
   - 운영 지표 수집

## 3. 컴포넌트별 상세 설명

### 3.1 Data Collector
- **주요 파일**:
  - `main.py`: 메인 애플리케이션 및 스케줄러
  - `blizzard_api.py`: Blizzard API 통신
  - `health_server.py`: 상태 모니터링
  - `monitoring.py`: 성능 모니터링

- **기능**:
  - 자동화된 데이터 수집
  - 에러 처리 및 재시도 메커니즘
  - 로깅 및 모니터링
  - 데이터 정제 및 가공

### 3.2 Next.js Frontend
- **주요 컴포넌트**:
  - 경매장 메인 페이지
  - 아이템 상세 정보 모달
  - 검색 및 필터링 기능
  - 가격 트렌드 차트

- **데이터 처리**:
  - 실시간 데이터 업데이트
  - 클라이언트 사이드 캐싱
  - 동적 데이터 로딩
  - 에러 처리 및 폴백 UI

### 3.3 Server Admin
- **주요 기능**:
  - 서버 상태 모니터링
  - 로그 관리
  - 성능 메트릭 수집
  - 알림 시스템

## 4. 데이터 모델 및 API

### 4.1 데이터 모델
```typescript
interface AuctionItem {
  item_id: number;
  item_name: string;
  quality: string;
  level: number;
  unit_price: number;
  quantity: number;
  time_left: string;
  realm_id: string;
  item_class: string;
  item_subclass: string;
}

interface ItemClass {
  id: number;
  name: string;
  subclasses: Array<{
    id: number;
    name: string;
  }>;
}

interface RealmInfo {
  realm_id: string;
  name: string;
  region: string;
  connected_realms: string[];
}
```

### 4.2 API 엔드포인트
- `/api/auctions/[realmId]`: 서버별 경매 데이터
- `/api/auctions-by-item`: 아이템 이름(`itemName`)으로 해당 아이템의 모든 경매 데이터 조회
- `/api/realms`: 서버 목록
- `/api/item-classes`: 아이템 클래스 목록
- `/health`: 시스템 상태 체크

## 5. 주요 기능 구현 상태

### 5.1 구현 완료
- [x] 기본 데이터 수집 파이프라인
- [x] 실시간 데이터 동기화
- [x] 경매장 UI 기본 기능
- [x] 아이템 검색 및 필터링
- [x] 아이템 클래스 시스템

### 5.2 진행 중
- [ ] 가격 트렌드 분석
- [ ] 고급 검색 필터
- [ ] 사용자 알림 시스템
- [ ] 성능 최적화
- [ ] 아이템 클래스 기반 필터링 개선

## 6. 배포 및 운영 가이드

### 6.1 배포 환경
- Azure VM 호스팅
- Docker 컨테이너화
- GitHub Actions CI/CD

### 6.2 운영 요구사항
- MongoDB 3.6 이상
- Python 3.8 이상
- Node.js 16 이상
- Docker & Docker Compose

### 6.3 모니터링
- 시스템 헬스체크
- 성능 메트릭 수집
- 에러 로깅 및 알림

## 7. 향후 개선 사항

### 7.1 기술적 개선
- 데이터 수집 성능 최적화
- 캐싱 시스템 개선
- API 응답 시간 개선
- 테스트 커버리지 확대

### 7.2 기능 개선
- 고급 검색 필터 추가
- 사용자 맞춤 알림 설정
- 가격 예측 기능
- 아이템 연관 분석

### 7.3 운영 개선
- 자동화된 백업 시스템
- 장애 복구 프로세스
- 모니터링 대시보드
- 성능 분석 도구

## 8. 문제 해결 및 FAQ

### 8.1 알려진 이슈
- 동일 아이템 그룹화 시 정확도 개선 필요
- 대량 데이터 처리 시 성능 저하
- 일부 아이템 정보 누락

### 8.2 문제 해결 가이드
- 데이터 동기화 실패 시 재시도 메커니즘
- 캐시 무효화 전략
- 에러 복구 프로세스

## 9. 참고 자료

### 9.1 관련 문서
- [Blizzard API 문서](https://develop.battle.net/documentation/world-of-warcraft)
- [Next.js 공식 문서](https://nextjs.org/docs)
- [MongoDB 문서](https://docs.mongodb.com)

### 9.2 유용한 링크
- 프로젝트 GitHub 저장소
- 배포 환경 접속 정보
- 모니터링 대시보드 