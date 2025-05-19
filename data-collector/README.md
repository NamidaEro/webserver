# WoW 경매장 데이터 수집기

World of Warcraft(WoW) 경매장 데이터와 아이템 메타데이터를 주기적으로 수집하여 MongoDB에 저장하는 Python 서비스입니다.

## 기능

- Blizzard API를 통해 WoW 경매장 데이터를 수집
- 아이템 ID에 대한 메타데이터(이름, 품질, 분류 등)를 수집하고 저장
- 수집된 데이터를 MongoDB에 저장 (DB: `wowauction`, 컬렉션: `auctions`, `item_metadata`)
- 시간별 스케줄링으로 데이터를 주기적으로 업데이트
- 오래된 데이터 자동 정리 (Blizzard API 응답에 따름, realm별 전체 데이터 덮어쓰기)
- 헬스체크 및 데이터 조회를 위한 HTTP API 엔드포인트 제공
- 성능 모니터링 및 통계 기능

## 설정 방법

### 1. 환경 변수 설정

`.env` 파일을 다음과 같이 생성합니다:

```
# Blizzard API 설정
BLIZZARD_CLIENT_ID=your_client_id_here
BLIZZARD_CLIENT_SECRET=your_client_secret_here
BLIZZARD_REGION=kr # 예: us, eu, kr, tw
BLIZZARD_NAMESPACE=dynamic-kr # 예: dynamic-us, static-eu, dynamic-kr
BLIZZARD_LOCALE=ko_KR # 예: en_US, de_DE, ko_KR

# MongoDB 설정
# 예시: mongodb://username:password@host:port/wowauction?authSource=admin
# Docker Compose 사용 시 docker-compose.yml의 서비스 이름을 host로 사용할 수 있습니다. (예: mongodb://yui:password@mongo:27017/wowauction?authSource=admin)
MONGODB_URI=your_mongodb_connection_string_here 

# 데이터 수집 설정
# 수집 간격 (분 단위, 기본값: 60분)
COLLECTION_INTERVAL=60

# 최대 처리 realm 수 (0: 모든 realm 처리, 기본값: 0)
MAX_REALMS=0  

# 데이터 보관 기간 (일 단위, 기본값: 7일) - 현재 로직은 realm별 데이터 전체 덮어쓰기로 직접적인 데이터 보관 기간 설정은 없음.
# DATA_RETENTION_DAYS=7 # 주석 처리 또는 삭제

# 헬스체크 서버 포트 (기본값: 8080)
HEALTH_PORT=8080
```

### 2. 필요한 패키지 설치

```
pip install -r requirements.txt
```

### 3. 실행 방법

직접 실행:
```
python main.py
```

Docker를 사용한 실행:
```
docker build -t wow-data-collector .
# .env 파일 경로를 알맞게 수정하세요.
docker run -d --name wow-collector --env-file .env -p 8080:8080 -v $(pwd)/logs:/app/logs wow-data-collector 
```

Docker Compose를 사용한 실행:
```
docker-compose up -d
```

## 아키텍처

- `main.py`: 애플리케이션 진입점, 스케줄러 설정, MongoDB 데이터 저장 로직 포함
- `blizzard_api.py`: Blizzard API 통신 로직
- `logger_config.py`: 로깅 설정 및 관리
- `monitoring.py`: 성능 모니터링 및 통계 수집
- `health_server.py`: HTTP API 서버 (데이터 조회, 헬스체크, 상태 확인 기능 포함)
- `requirements.txt`: 필요한 Python 패키지 목록
- `Dockerfile`: Docker 이미지 빌드 설정

## 데이터 구조 (MongoDB)

### `auctions` 컬렉션

- 각 문서는 하나의 경매 아이템을 나타냅니다.
- 주요 필드: 
  - `blizzard_auction_id`: Blizzard API에서 제공하는 고유 경매 ID
  - `item_id`: 아이템 고유 ID
  - `item_obj`: 아이템 상세 정보 객체 (API 응답 그대로 저장)
  - `item_name`: 아이템 이름 (메타데이터에서 추출)
  - `item_quality`: 아이템 품질 (메타데이터에서 추출)
  - `buyout`: 즉시 구매가
  - `quantity`: 수량
  - `time_left`: 남은 시간 (예: `SHORT`, `MEDIUM`, `LONG`, `VERY_LONG`)
  - `realm_id`: 서버(realm) ID
  - `collection_time`: 데이터 수집 시간 (ISO 형식 문자열)
  - `_id`: MongoDB 자동 생성 ObjectId

### `item_metadata` 컬렉션

- 각 문서는 하나의 아이템에 대한 메타데이터를 나타냅니다.
- 주요 필드:
  - `item_id`: 아이템 고유 ID
  - `name`: 아이템 이름
  - `quality`: 아이템 품질 (일반, 고급, 희귀, 영웅, 전설 등)
  - `item_class`: 아이템 분류 (무기, 방어구, 소비품 등)
  - `item_subclass`: 아이템 하위 분류
  - `inventory_type`: 장착 위치
  - `level`: 아이템 레벨
  - `required_level`: 요구 레벨
  - `media_id`: 아이템 이미지 미디어 ID
  - `full_data`: 전체 아이템 데이터 (Blizzard API 응답)
  - `updated_at`: 업데이트 시간 (ISO 형식 문자열)
  - `_id`: MongoDB 자동 생성 ObjectId

## HTTP API 엔드포인트

### 데이터 조회 API

- `/auctions?realm_id=<id>&limit=<limit>&page=<page>`: 특정 realm의 경매 데이터 조회
  - `realm_id`: 필수 파라미터, 서버(realm) ID
  - `limit`: 선택적 파라미터, 한 페이지당 결과 수 (기본값: 20)
  - `page`: 선택적 파라미터, 페이지 번호 (기본값: 1)
  - 응답에는 `item_name`과 `item_quality` 필드가 포함됩니다.

- `/realms`: 현재 데이터베이스에 저장된 모든 realm 목록과 각 realm의 경매 아이템 수 조회

- `/item-metadata?item_id=<id>`: 특정 아이템 ID의 메타데이터 조회
  - `item_id`: 필수 파라미터, 아이템 ID

### 관리 API

- `/health`: 애플리케이션 상태 확인 (Docker 헬스체크용)
- `/metrics`: 성능 지표 및 통계 정보
- `/collect`: 모든 realm에 대해 데이터 수집을 강제로 실행
- `/collect?realm_id=<id>`: 특정 realm ID에 대해서만 데이터 수집을 강제로 실행
- `/item-update`: 아이템 메타데이터 업데이트를 강제로 실행
- `/db-status`: MongoDB 연결 상태 및 컬렉션 정보 확인

### 사용 예시

#### 경매 데이터 조회 (realm ID가 205인 경우):
```
curl http://<서버주소>:8080/auctions?realm_id=205&limit=10&page=1
```

#### 모든 realm 목록 조회:
```
curl http://<서버주소>:8080/realms
```

#### 아이템 메타데이터 조회 (아이템 ID가 223087인 경우):
```
curl http://<서버주소>:8080/item-metadata?item_id=223087
```

#### 특정 realm 데이터 강제 수집 (realm ID가 205인 경우):
```
curl http://<서버주소>:8080/collect?realm_id=205
```

#### 아이템 메타데이터 업데이트 강제 실행:
```
curl http://<서버주소>:8080/item-update
```

## 아이템 메타데이터 수집 프로세스

1. Blizzard API를 통해 경매 데이터를 수집하는 과정에서 고유한 아이템 ID 목록을 추출합니다.
2. 추출된 아이템 ID 중 메타데이터가 없는 항목을 식별합니다.
3. 백그라운드 프로세스에서 누락된 아이템의 메타데이터를 Blizzard API를 통해 수집합니다.
4. 수집된 메타데이터는 `item_metadata` 컬렉션에 저장됩니다.
5. 경매 데이터 API 응답 시, 아이템 ID를 기반으로 메타데이터(이름, 품질 등)를 결합하여 반환합니다.

## 로그 및 모니터링

로그는 `logs` 디렉토리에 일별로 저장됩니다. Docker 환경에서는 볼륨을 통해 호스트에 마운트할 수 있습니다. 
성능 통계는 `/metrics` 엔드포인트 또는 로그를 통해 확인할 수 있습니다. 