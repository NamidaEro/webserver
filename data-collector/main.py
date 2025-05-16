import os
import time
import schedule
import logging
import signal
import sys
from datetime import datetime, timedelta

from logger_config import setup_logger, get_logger
from blizzard_api import get_access_token, get_connected_realms, get_auctions
# from firebase_db import save_auctions_to_firestore, init_firestore, get_realms_with_data
from monitoring import Timer, stats
from health_server import health_server

# 로깅 설정
setup_logger()
logger = get_logger('data-collector')

# 환경 변수
MAX_REALMS = int(os.getenv('MAX_REALMS', '0'))  # 0은 모든 realm 처리
COLLECTION_INTERVAL = int(os.getenv('COLLECTION_INTERVAL', '60'))  # 분 단위, 기본 60분(1시간)
DATA_RETENTION_DAYS = int(os.getenv('DATA_RETENTION_DAYS', '7'))  # 데이터 보관 기간, 기본 7일

# 종료 플래그
shutdown_requested = False

def signal_handler(sig, frame):
    """종료 시그널 처리"""
    global shutdown_requested
    logger.info(f"종료 신호 받음: {sig}")
    shutdown_requested = True

def collect_auction_data():
    """Blizzard API에서 경매장 데이터를 수집하여 Firestore에 저장"""
    if shutdown_requested:
        logger.info("종료 요청으로 데이터 수집 작업을 건너뜁니다.")
        return
    
    try:
        with Timer("전체 데이터 수집"):
            logger.info("데이터 수집 시작")
            
            # Blizzard API 토큰 발급
            token = get_access_token()
            logger.info(f"API 토큰 발급 완료: {token[:10]}...")
            
            # Connected Realms 목록 조회
            realms = get_connected_realms(token)
            total_realms = len(realms)
            logger.info(f"총 {total_realms}개 realm 발견")
            
            # 처리할 realm 수 제한 (필요 시)
            if MAX_REALMS > 0 and MAX_REALMS < total_realms:
                logger.info(f"환경 변수 설정으로 처리할 realm 수를 {MAX_REALMS}개로 제한합니다.")
                realms = realms[:MAX_REALMS]
            
            # Firestore 초기화
            # db = init_firestore()
            
            # 모든 realm에 대해 경매 데이터 수집
            for idx, realm in enumerate(realms):
                if shutdown_requested:
                    logger.info("종료 요청으로 데이터 수집을 중단합니다.")
                    break
                    
                realm_url = realm['href']
                connected_realm_id = realm_url.split('/')[-1].split('?')[0]
                
                try:
                    with Timer(f"Realm {connected_realm_id} 데이터 수집"):
                        logger.info(f"[{idx+1}/{len(realms)}] Realm ID {connected_realm_id} 데이터 수집 중...")
                        
                        # 경매 데이터 가져오기
                        auctions_data = get_auctions(token, connected_realm_id)
                        
                        # 현재 timestamp 추가
                        collection_time = datetime.now().isoformat()
                        
                        # Firestore에 저장
                        # save_auctions_to_firestore(db, connected_realm_id, auctions_data, collection_time)
                        
                        logger.info(f"Realm ID {connected_realm_id} 데이터 저장 완료")
                except Exception as e:
                    logger.error(f"Realm ID {connected_realm_id} 처리 중 오류 발생: {str(e)}")
                    # 한 realm의 오류가 전체 프로세스를 중단시키지 않도록 계속 진행
                    continue
                
                # API 호출 간 간격 (Blizzard API 제한 고려)
                time.sleep(1)
            
            # 성능 통계 로깅
            stats.log_stats()
            logger.info("데이터 수집 완료")
        
    except Exception as e:
        logger.error(f"데이터 수집 중 오류 발생: {str(e)}", exc_info=True)

def collect_realm_auction_data(realm_id):
    """특정 Realm에 대해 Blizzard API에서 경매장 데이터를 수집하여 Firestore에 저장"""
    if shutdown_requested:
        logger.info("종료 요청으로 데이터 수집 작업을 건너뜁니다.")
        return
    
    try:
        with Timer(f"Realm {realm_id} 데이터 수집"):
            logger.info(f"Realm ID {realm_id} 데이터 수집 시작")
            
            # Blizzard API 토큰 발급
            token = get_access_token()
            logger.info(f"API 토큰 발급 완료: {token[:10]}...")
            
            # Firestore 초기화
            # db = init_firestore()
            
            # 경매 데이터 가져오기
            auctions_data = get_auctions(token, realm_id)
            
            # 현재 timestamp 추가
            collection_time = datetime.now().isoformat()
            
            # Firestore에 저장
            # save_auctions_to_firestore(db, realm_id, auctions_data, collection_time)
            
            # 성능 통계 로깅
            stats.log_stats()
            logger.info(f"Realm ID {realm_id} 데이터 수집 완료")
        
    except Exception as e:
        logger.error(f"Realm ID {realm_id} 데이터 수집 중 오류 발생: {str(e)}", exc_info=True)

def health_check():
    """애플리케이션 상태 확인 및 보고"""
    try:
        logger.info("상태 확인 시작")
        
        # Firestore 연결 확인
        # db = init_firestore()
        
        # 데이터가 있는 realm 수 확인
        # realms = get_realms_with_data(db)
        
        # 성능 통계 조회
        app_stats = stats.get_stats()
        
        # logger.info(f"상태 확인 결과: 정상 작동 중, {len(realms)}개 realm에 데이터 존재, " +
        #            f"API 호출: {app_stats['api_calls']}회, 오류: {app_stats['api_errors']}회, " +
        #            f"DB 작업: {app_stats['db_operations']}회, 오류: {app_stats['db_errors']}회")
        logger.info(f"상태 확인 결과: 정상 작동 중 (MongoDB 확인 로직 추가 예정), " +
                   f"API 호출: {app_stats['api_calls']}회, 오류: {app_stats['api_errors']}회") # 임시 로그
    except Exception as e:
        logger.error(f"상태 확인 중 오류 발생: {str(e)}")

def schedule_jobs():
    """스케줄러 설정: 주기적 데이터 수집 및 상태 확인"""
    # 시그널 핸들러 등록
    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)
    
    # 환경 변수를 통한 스케줄 간격 설정
    logger.info(f"스케줄 간격: {COLLECTION_INTERVAL}분마다 데이터 수집, {DATA_RETENTION_DAYS}일간 데이터 보관")
    
    # 데이터 수집 스케줄 설정
    schedule.every(COLLECTION_INTERVAL).minutes.do(collect_auction_data)
    
    # 상태 확인 스케줄 설정
    schedule.every(30).minutes.do(health_check)
    
    # 처음 실행 시 즉시 한 번 실행
    logger.info("첫 번째 데이터 수집 시작")
    collect_auction_data()
    
    logger.info("스케줄러 시작됨")
    
    # 스케줄러 무한 루프
    while not shutdown_requested:
        schedule.run_pending()
        time.sleep(10)  # 10초마다 스케줄 확인
    
    logger.info("종료 요청으로 스케줄러 종료")

if __name__ == "__main__":
    try:
        logger.info("WoW 경매장 데이터 수집기 시작")
        
        # 헬스체크 서버 시작
        health_server.start()
        
        # 데이터 수집 함수 등록
        health_server.set_collect_function(collect_auction_data)
        health_server.set_realm_collect_function(collect_realm_auction_data)
        
        # 스케줄러 시작
        schedule_jobs()
    except Exception as e:
        logger.critical(f"애플리케이션 실행 중 치명적 오류 발생: {str(e)}", exc_info=True)
    finally:
        # 헬스체크 서버 종료
        if health_server.is_running:
            health_server.stop()
            
        logger.info("애플리케이션 종료")
        sys.exit(0) 