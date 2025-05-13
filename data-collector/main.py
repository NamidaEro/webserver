import os
import time
import schedule
import logging
from datetime import datetime

from blizzard_api import get_access_token, get_connected_realms, get_auctions
from firebase_db import save_auctions_to_firestore, init_firestore

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('data-collector')

def collect_auction_data():
    """Blizzard API에서 경매장 데이터를 수집하여 Firestore에 저장"""
    try:
        logger.info("데이터 수집 시작")
        
        # Blizzard API 토큰 발급
        token = get_access_token()
        logger.info(f"API 토큰 발급 완료: {token[:10]}...")
        
        # Connected Realms 목록 조회
        realms = get_connected_realms(token)
        logger.info(f"총 {len(realms)}개 realm 발견")
        
        # Firestore 초기화
        db = init_firestore()
        
        # 모든 realm에 대해 경매 데이터 수집
        for realm in realms[:10]:  # 테스트를 위해 10개로 제한, 추후 모든 realm으로 확장
            realm_url = realm['href']
            connected_realm_id = realm_url.split('/')[-1].split('?')[0]
            
            logger.info(f"Realm ID {connected_realm_id} 데이터 수집 중...")
            
            # 경매 데이터 가져오기
            auctions_data = get_auctions(token, connected_realm_id)
            
            # 현재 timestamp 추가
            collection_time = datetime.now().isoformat()
            
            # Firestore에 저장
            save_auctions_to_firestore(db, connected_realm_id, auctions_data, collection_time)
            
            logger.info(f"Realm ID {connected_realm_id} 데이터 저장 완료")
            
            # API 호출 간 간격 (Blizzard API 제한 고려)
            time.sleep(1)
            
        logger.info("데이터 수집 완료")
        
    except Exception as e:
        logger.error(f"데이터 수집 중 오류 발생: {str(e)}", exc_info=True)

def schedule_jobs():
    """스케줄러 설정: 매 시간마다 데이터 수집"""
    schedule.every().hour.do(collect_auction_data)
    
    # 처음 실행 시 즉시 한 번 실행
    collect_auction_data()
    
    logger.info("스케줄러 시작됨 - 매 시간마다 데이터 수집")
    
    # 스케줄러 무한 루프
    while True:
        schedule.run_pending()
        time.sleep(60)  # 1분마다 스케줄 확인

if __name__ == "__main__":
    schedule_jobs() 