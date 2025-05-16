FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

ENV DOCKER_VERSION=25.0.3
ENV PATH="/usr/local/bin:${PATH}"
# 1. curl만 먼저 설치
RUN apt-get update && apt-get install -y curl
# 2. docker 바이너리 다운로드 및 설치
RUN curl -L https://download.docker.com/linux/static/stable/x86_64/docker-${DOCKER_VERSION}.tgz -o /tmp/docker.tgz && \
    tar -xzvf /tmp/docker.tgz -C /tmp && \
    cp /tmp/docker/docker /usr/local/bin/ && \
    chmod +x /usr/local/bin/docker && \
    rm -rf /var/lib/apt/lists/* /tmp/docker*

COPY . .

EXPOSE 5001

CMD ["python", "app.py"] 