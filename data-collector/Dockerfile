FROM python:3.11-slim

# 비 루트 사용자 설정
RUN groupadd -r collector && useradd -r -g collector collector

# 작업 디렉토리 설정
WORKDIR /app

# 시스템 패키지 설치 (uv 필요 종속성 포함)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    rustc \
    cargo \
    && rm -rf /var/lib/apt/lists/*

# uv 설치, 환경 설정 및 확인, requirements 설치
COPY requirements.txt .
RUN curl -sSf https://astral.sh/uv/install.sh | sh && \
    sh -c ". /root/.cargo/env && \
    uv --version && \
    uv pip install --system --no-cache -r requirements.txt"

# 로그 및 데이터 디렉토리 생성
RUN mkdir -p /app/logs && chown -R collector:collector /app/logs

# 애플리케이션 코드 복사
COPY *.py ./

# Firebase 서비스 계정 파일이 존재하는 경우 복사 (빌드 시 존재하지 않아도 오류 없음)
COPY wowauction-6229a-firebase-adminsdk-fbsvc-6ded3fa1d5.json* ./

# 권한 설정
RUN chown -R collector:collector /app

# PATH에 uv 추가
ENV PATH="/root/.cargo/bin:${PATH}"

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