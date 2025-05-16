FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# docker CLI 바이너리 직접 설치 (공식 릴리즈)
ENV DOCKER_VERSION=25.0.3
RUN apt-get update && \
    apt-get install -y curl && \
    curl -L https://download.docker.com/linux/static/stable/x86_64/docker-${DOCKER_VERSION}.tgz | tar -xz -C /usr/local/bin --strip-components=1 docker/docker && \
    chmod +x /usr/local/bin/docker && \
    rm -rf /var/lib/apt/lists/*

COPY . .

EXPOSE 5001

CMD ["python", "app.py"] 