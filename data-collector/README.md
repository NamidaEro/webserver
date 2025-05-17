# WoW 경매장 데이터 수집기

World of Warcraft(WoW) 경매장 데이터를 주기적으로 수집하여 MongoDB에 저장하는 Python 서비스입니다.

## 기능

- Blizzard API를 통해 WoW 경매장 데이터를 수집
- 수집된 데이터를 MongoDB에 저장 (데이터베이스명: `wowauction`, 컬렉션명: `auctions`)
- 시간별 스케줄링으로 데이터를 주기적으로 업데이트 (기존 데이터 삭제 후 새로 삽입)
- 오래된 데이터 자동 정리 (Blizzard API 응답에 따름, 현재는 realm별 전체 데이터 덮어쓰기)
- 헬스체크 엔드포인트 제공 (Docker 통합용)
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
- `health_server.py`: 헬스체크 HTTP 서버 (MongoDB 상태 확인 포함)
- `requirements.txt`: 필요한 Python 패키지 목록
- `Dockerfile`: Docker 이미지 빌드 설정

## 데이터 구조 (MongoDB)

### `auctions` 컬렉션

- 각 문서는 하나의 경매 아이템을 나타냅니다.
- 주요 필드: 
  - `blizzard_auction_id`: Blizzard API에서 제공하는 고유 경매 ID
  - `item_id`: 아이템 고유 ID
  - `item_obj`: 아이템 상세 정보 객체 (API 응답 그대로 저장)
  - `buyout`: 즉시 구매가
  - `quantity`: 수량
  - `time_left`: 남은 시간 (예: `SHORT`, `MEDIUM`, `LONG`, `VERY_LONG`)
  - `realm_id`: 서버(realm) ID
  - `collection_time`: 데이터 수집 시간 (ISO 형식 문자열)
  - `_id`: MongoDB 자동 생성 ObjectId

## HTTP 엔드포인트

- `/health`: 애플리케이션 상태 확인 (Docker 헬스체크용)
- `/metrics`: 성능 지표 및 통계 정보
- `/collect`: 모든 realm에 대해 데이터 수집을 강제로 실행
- `/collect?realm_id=<id>`: 특정 realm ID에 대해서만 데이터 수집을 강제로 실행
- `/db-status`: MongoDB 연결 상태 및 `auctions` 컬렉션 정보 확인

### 강제 데이터 수집 예시

모든 realm 데이터 강제 수집:
```
curl http://<서버주소>:8080/collect
```

특정 realm 데이터 강제 수집 (예: realm ID가 205인 경우):
```
curl http://<서버주소>:8080/collect?realm_id=205
```

## 로그 및 모니터링

로그는 `logs` 디렉토리에 일별로 저장됩니다. Docker 환경에서는 볼륨을 통해 호스트에 마운트할 수 있습니다. 
성능 통계는 `/metrics` 엔드포인트 또는 로그를 통해 확인할 수 있습니다. 