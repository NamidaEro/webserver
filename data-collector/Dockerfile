FROM python:3.11-slim

# 비 루트 사용자 설정
RUN groupadd -r collector && useradd -r -g collector collector

# 작업 디렉토리 설정
WORKDIR /app

# 시스템 패키지 설치 (uv 필요 종속성 포함)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    bash \
    && rm -rf /var/lib/apt/lists/*

# requirements.txt 복사 및 pip를 사용하여 패키지 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 로그 및 데이터 디렉토리 생성
RUN mkdir -p /app/logs && chown -R collector:collector /app/logs

# 애플리케이션 코드 복사
COPY *.py ./

# 권한 설정
RUN chown -R collector:collector /app

# 비 루트 사용자로 전환
USER collector

# 환경 변수 설정
ENV PYTHONUNBUFFERED=1
ENV LOG_DIR=/app/logs

# 볼륨 설정
VOLUME ["/app/logs"]

# 컨테이너 실행 명령
CMD ["python", "main.py"]

# 헬스체크 설정
HEALTHCHECK --interval=5m --timeout=30s --start-period=1m --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1 