# 아키텍처 및 폴더 구조 설계

## 1. 전체 아키텍처

```
[Blizzard API]
     │
     ▼
[data-collector (Python)]  # 데이터 수집 백엔드
     │
     ▼
[Firebase Firestore (DB)]
     │
     ▼
[nextjs-app (Next.js)]     # 웹 프론트엔드
```

- **data-collector (Python)**: 주기적으로 Blizzard API를 호출해 Firestore에 경매 데이터를 저장
- **nextjs-app (Next.js)**: Firestore에서 데이터를 읽어와 사용자에게 웹 UI로 제공

---

## 2. 폴더 구조 예시

```
/webserver
│
├── nextjs-app/              # Next.js 기반 웹 프론트엔드
│   └── ...                  # (app, components, lib 등)
│
├── data-collector/          # Python 기반 데이터 수집 백엔드
│   ├── main.py
│   ├── requirements.txt
│   └── ...                  # (API 연동, Firestore 저장 등)
│
├── public/                  # (공통 정적 파일, 필요시)
├── README.md
└── 기타 설정 파일
```

---

## 3. 장점
- 역할 분리로 유지보수와 확장성이 뛰어남
- 각 프로젝트를 독립적으로 개발, 테스트, 배포 가능
- 언어/프레임워크별로 최적화된 개발 환경 활용
- 데이터 수집 백엔드는 추후 서버리스, 컨테이너 등 다양한 방식으로 확장 가능

---

## 4. 서비스별 Dockerfile + docker-compose + GitHub Actions 자동화 구조

- 각 서비스 폴더(예: data-collector, nextjs-app)에 Dockerfile을 둡니다.
- 최상위 /webserver 폴더에 docker-compose.yml을 두고, 여러 서비스를 한 번에 관리/실행합니다.
- GitHub Actions 워크플로우에서 서버로 SSH 접속하여 git pull, docker-compose build, docker-compose up -d 명령을 자동으로 실행합니다.
- 이를 통해 코드가 push될 때마다 서버에서 최신 코드로 각 서비스가 자동으로 실행(또는 재시작)됩니다.
- 이 방식은 확장성, 유지보수, 자동화에 매우 적합하며 실무에서도 널리 사용됩니다.

---

> 데이터 수집 백엔드의 구체적 방식(서버리스, VM, 컨테이너 등)은 추후 확정 예정 
