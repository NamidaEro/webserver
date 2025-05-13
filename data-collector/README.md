# WoW 경매장 데이터 수집기

World of Warcraft(WoW) 경매장 데이터를 주기적으로 수집하여 Firebase Firestore에 저장하는 Python 서비스입니다.

## 기능

- Blizzard API를 통해 WoW 경매장 데이터를 수집
- 수집된 데이터를 Firebase Firestore에 저장
- 시간별 스케줄링으로 데이터를 주기적으로 업데이트
- 오래된 데이터 자동 정리 (기본 7일)
- 헬스체크 엔드포인트 제공 (Docker 통합용)
- 성능 모니터링 및 통계 기능

## 설정 방법

### 1. 환경 변수 설정

`.env` 파일을 다음과 같이 생성합니다:

```
# Blizzard API 설정
BLIZZARD_CLIENT_ID=your_client_id_here
BLIZZARD_CLIENT_SECRET=your_client_secret_here
BLIZZARD_REGION=kr
BLIZZARD_NAMESPACE=dynamic-kr
BLIZZARD_LOCALE=ko_KR

# Firebase 설정 (두 가지 방법 중 하나 선택)
# 방법 1: 서비스 계정 파일 경로 지정
GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/firebase-credentials.json

# 방법 2: 서비스 계정 JSON 직접 입력 (Docker 환경에서 추천)
# FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"your-project-id",...}

# 데이터 수집 설정
# 수집 간격 (분 단위, 기본값: 60분)
COLLECTION_INTERVAL=60

# 최대 처리 realm 수 (0: 모든 realm 처리, 기본값: 0)
MAX_REALMS=0  

# 데이터 보관 기간 (일 단위, 기본값: 7일)
DATA_RETENTION_DAYS=7

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
docker run -d --name wow-collector --env-file .env -p 8080:8080 -v $(pwd)/logs:/app/logs wow-data-collector
```

Docker Compose를 사용한 실행:
```
docker-compose up -d
```

## 아키텍처

- `main.py`: 애플리케이션 진입점 및 스케줄러 설정
- `blizzard_api.py`: Blizzard API 통신 로직
- `firebase_db.py`: Firebase Firestore 저장 로직
- `logger_config.py`: 로깅 설정 및 관리
- `monitoring.py`: 성능 모니터링 및 통계 수집
- `health_server.py`: 헬스체크 HTTP 서버
- `requirements.txt`: 필요한 Python 패키지 목록
- `Dockerfile`: Docker 이미지 빌드 설정

## 데이터 구조

### Firestore 컬렉션

1. `auctions`: 경매 데이터 저장
   - Document ID: `{realm_id}_{auction_id}`
   - 필드: 
     - realm_id: 서버 ID
     - auction_id: 경매 ID
     - item_id: 아이템 ID
     - bid: 현재 입찰가
     - buyout: 즉시 구매가
     - quantity: 수량
     - time_left: 남은 시간
     - collection_time: 수집 시간 (ISO 형식)
     - timestamp: 서버 타임스탬프

2. `realm_summaries`: 서버별 경매 요약 정보
   - Document ID: `{realm_id}`
   - 필드:
     - realm_id: 서버 ID
     - total_auctions: 총 경매 수
     - last_updated: 마지막 업데이트 시간
     - timestamp: 서버 타임스탬프

## HTTP 엔드포인트

- `/health`: 애플리케이션 상태 확인 (Docker 헬스체크용)
- `/metrics`: 성능 지표 및 통계 정보

## 로그 및 모니터링

로그는 `logs` 디렉토리에 일별로 저장됩니다. Docker 환경에서는 볼륨을 통해 호스트에 마운트할 수 있습니다. 