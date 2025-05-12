# 프로젝트 개요

## 1. 프로젝트명
**월드 오브 워크래프트 경매장 웹 서비스**

## 2. 목적
- 월드 오브 워크래프트(World of Warcraft, WoW) 게임 내 경매장(Auction House) 데이터를 시각적으로 제공하는 웹 서비스 구축
- 유저들이 실시간 또는 주기적으로 갱신된 경매장 정보를 쉽게 검색, 조회, 분석할 수 있도록 지원

## 3. 주요 기능
- 서버(Realm)별 경매장 데이터 조회
- 아이템별 경매 현황(가격, 수량, 최근 거래 등) 검색
- 다양한 필터 및 정렬 기능(아이템명, 등급, 가격 등)
- 데이터 최신화(Blizzard API → Firestore → 웹 서비스)
- (선택) 통계, 트렌드, 그래프 등 시각화 기능

## 4. 기술 스택(예정)
- **프론트엔드**: Next.js(React), TypeScript, Tailwind CSS 등
- **백엔드/데이터 수집**: Google Cloud Functions(서버리스), Node.js, Firebase Firestore
- **외부 API**: Blizzard Open API(Auctions)
- **배포/호스팅**: Vercel, Firebase Hosting, 또는 기타 클라우드

## 5. 기대 효과
- WoW 유저들에게 편리한 경매장 정보 제공
- 데이터 기반의 아이템 거래/분석 지원
- 실시간/주기적 데이터 갱신으로 신뢰성 있는 정보 제공 