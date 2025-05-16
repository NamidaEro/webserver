FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# docker CLI 및 docker-compose 설치
RUN apt-get update \
    && apt-get install -y docker.io curl \
    && curl -L "https://github.com/docker/compose/releases/download/v2.20.3/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose \
    && chmod +x /usr/local/bin/docker-compose \
    && rm -rf /var/lib/apt/lists/*

COPY . .

EXPOSE 5001

CMD ["python", "app.py"] 