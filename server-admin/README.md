# server-admin

서버 상태 확인, 재시작, 로그 확인을 위한 관리용 Flask 웹 서버

## 실행 방법

```bash
pip install -r requirements.txt
python app.py
```

## API 엔드포인트
- **GET /status** : 도커 컨테이너 상태 확인
- **POST /restart** : 도커 컨테이너 전체 재시작
- **GET /logs** : 최근 100줄 로그 확인 