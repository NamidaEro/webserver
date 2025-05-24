# Todo List

## 아이템 카테고리 시스템 구현

### 1. Data Collector 작업
1. Blizzard API 연동
   - item-class API 엔드포인트 연동 (/data/wow/item-class/index)
   - API 파라미터 설정 (namespace=static-kr, locale=ko_KR)
   - blizzard_api.py에 관련 함수 추가

2. 데이터 수집 및 저장
   - 아이템 클래스 정보 수집 로직 구현
   - MongoDB에 아이템 클래스 컬렉션 생성
   - 주기적인 데이터 업데이트 로직 구현

3. API 엔드포인트 구현
   - 아이템 클래스 조회 엔드포인트 추가
   - 경매장 아이템 조회 시 클래스 정보 포함하도록 수정

### 2. 프론트엔드 작업
1. 타입 정의 수정
   - ItemSubObject에 category 필드 추가
   - 카테고리 관련 인터페이스 정의

2. UI 구현
   - 카테고리별 필터링 로직 구현
   - 카테고리 선택 UI와 필터링 연동
   - 카테고리 정보 표시 개선

### 3. 테스트 및 검증
1. Data Collector 테스트
   - Blizzard API 연동 테스트
   - 데이터 수집 및 저장 검증
   - API 엔드포인트 동작 확인

2. 프론트엔드 테스트
   - 카테고리 필터링 동작 확인
   - UI 렌더링 테스트
   - 전체 기능 통합 테스트
