import os
import time
import schedule
import logging
import signal
import sys
from datetime import datetime, timedelta

from logger_config import setup_logger, get_logger
from blizzard_api import get_access_token, get_connected_realms, get_auctions, get_item_info
# from firebase_db import save_auctions_to_firestore, init_firestore, get_realms_with_data
from monitoring import Timer, stats
from health_server import health_server
from pymongo import MongoClient

# 로깅 설정
setup_logger()
logger = get_logger('data-collector')

# 환경 변수
MONGODB_URI = os.getenv("MONGODB_URI")
MAX_REALMS = int(os.getenv('MAX_REALMS', '0'))  # 0은 모든 realm 처리
COLLECTION_INTERVAL = int(os.getenv('COLLECTION_INTERVAL', '60'))  # 분 단위, 기본 60분(1시간)
DATA_RETENTION_DAYS = int(os.getenv('DATA_RETENTION_DAYS', '7'))  # 데이터 보관 기간, 기본 7일

# 종료 플래그
shutdown_requested = False

# MongoDB 클라이언트 및 컬렉션 초기화
mongo_client = None
db = None
auctions_collection = None

if MONGODB_URI:
    try:
        mongo_client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
        mongo_client.admin.command('ping') # 연결 테스트
        
        # MONGODB_URI에서 데이터베이스 이름 가져오기 (없으면 기본 DB 사용)
        # UI API와 일관성을 위해 'wowauction'을 사용하도록 유도
        uri_db_name = MongoClient(MONGODB_URI).get_database().name
        if "/wowauction" in MONGODB_URI.lower():
            db_name = "wowauction"
        elif uri_db_name and uri_db_name != 'admin': # URI에 명시된 DB가 있고 admin이 아니면 사용
            db_name = uri_db_name
        else: # 그 외의 경우 'wowauction'으로 고정 (또는 오류 발생)
            db_name = "wowauction" 
            logger.warning(f"MONGODB_URI에 데이터베이스 이름이 명확하지 않아 'wowauction'으로 설정합니다. URI에 '/wowauction'을 포함해주세요.")

        db = mongo_client[db_name]
        auctions_collection = db["auctions"] # 컬렉션 이름 'auctions'
        logger.info(f"MongoDB 연결 성공: Database: {db.name}, Collection: {auctions_collection.name}")
    except Exception as e:
        logger.error(f"MongoDB 연결 실패: {e}", exc_info=True)
        mongo_client = None # 연결 실패 시 None으로 설정

def signal_handler(sig, frame):
    """종료 시그널 처리"""
    global shutdown_requested
    logger.info(f"종료 신호 받음: {sig}")
    shutdown_requested = True

def save_auctions_to_mongodb(realm_id, auctions_data_list, collection_time):
    """MongoDB에 경매 데이터를 저장 (기존 데이터 삭제 후 새로 삽입)"""
    if mongo_client is None or auctions_collection is None:
        logger.error("MongoDB 클라이언트가 초기화되지 않아 데이터를 저장할 수 없습니다.")
        stats.increment('db_errors')
        return

    if not auctions_data_list: # Blizzard API 응답의 auctions 리스트 직접 받도록 수정
        logger.info(f"Realm ID {realm_id}에 대한 경매 데이터가 없어 저장하지 않습니다.")
        return

    items_to_insert = []
    for auction in auctions_data_list:
        item_id = None
        # Blizzard API 응답에서 item 객체 내의 id를 item_id로 사용
        if isinstance(auction.get('item'), dict) and 'id' in auction['item']:
            item_id = auction['item']['id']
        
        document = {
            'blizzard_auction_id': auction.get('id'), # 블리자드 경매 ID
            'item_id': item_id,
            'item_obj': auction.get('item'), # 아이템 상세 정보 객체
            'buyout': auction.get('buyout'),
            'quantity': auction.get('quantity'),
            'time_left': auction.get('time_left'),
            'realm_id': int(realm_id), # 숫자형으로 저장
            'collection_time': collection_time, # ISO 형식 문자열
            # 'last_modified_timestamp': auction.get('last_modified_timestamp') # API 응답에 있다면 추가
        }
        items_to_insert.append(document)

    if not items_to_insert:
        logger.info(f"Realm ID {realm_id}에 대해 MongoDB에 저장할 가공된 데이터가 없습니다.")
        return

    try:
        with Timer(f"MongoDB 저장 (Realm ID: {realm_id})"):
            # 1. 해당 realm_id의 기존 데이터 삭제
            delete_result = auctions_collection.delete_many({'realm_id': int(realm_id)})
            logger.info(f"Realm ID {realm_id}의 기존 경매 데이터 {delete_result.deleted_count}건 삭제 완료.")
            stats.increment('db_operations')

            # 2. 새로운 데이터 삽입
            if items_to_insert: # 삽입할 아이템이 있을 경우에만 실행
                insert_result = auctions_collection.insert_many(items_to_insert)
                logger.info(f"Realm ID {realm_id}에 {len(insert_result.inserted_ids)}건의 경매 데이터 MongoDB 저장 완료.")
                stats.increment('db_operations', len(insert_result.inserted_ids))
                # stats.increment('items_processed_db', len(items_to_insert)) # items_processed와 중복될 수 있어 일단 주석
            else:
                logger.info(f"Realm ID {realm_id}에 MongoDB에 삽입할 최종 아이템이 없습니다.")

    except Exception as e:
        logger.error(f"Realm ID {realm_id} 데이터 MongoDB 저장 중 오류 발생: {e}", exc_info=True)
        stats.increment('db_errors')

def update_item_details_in_db(item_id: int, item_details: dict):
    """특정 item_id에 해당하는 모든 경매 문서의 item_obj를 업데이트합니다."""
    if not auctions_collection:
        logger.error("MongoDB auctions_collection이 초기화되지 않아 아이템 상세 정보를 업데이트할 수 없습니다.")
        return 0
    if not item_details:
        logger.warning(f"Item ID {item_id}에 대한 상세 정보가 비어 있어 업데이트하지 않습니다.")
        return 0

    try:
        # item_obj 필드만 업데이트하고, 다른 필드는 유지합니다.
        # API 응답 전체를 저장할지, 필요한 필드만 추출할지 결정 필요. 여기서는 전체 저장.
        result = auctions_collection.update_many(
            {'item_id': item_id},
            {'$set': {'item_obj': item_details}}
        )
        if result.modified_count > 0:
            logger.info(f"Item ID {item_id}: {result.modified_count}개 문서의 item_obj 업데이트 완료.")
        return result.modified_count
    except Exception as e:
        logger.error(f"Item ID {item_id} 상세 정보 DB 업데이트 중 오류: {e}", exc_info=True)
        stats.increment('db_errors')
        return 0

def fetch_and_update_single_item_info(item_id: int, token: str):
    """Blizzard API에서 아이템 상세 정보를 가져와 DB에 업데이트합니다."""
    logger.info(f"Item ID {item_id} 상세 정보 조회 및 업데이트 시작...")
    try:
        item_details = get_item_info(token, item_id) # blizzard_api.py의 함수
        if item_details:
            # 여기서 item_details 구조를 프론트엔드가 기대하는 형태로 추가 가공할 수 있습니다.
            # 예를 들어, name, quality, icon 등을 직접 추출하여 item_obj의 루트 레벨에 둘 수 있습니다.
            # 지금은 API 응답 그대로 저장합니다. 프론트엔드 API 라우트에서 이 구조를 파싱해야 합니다.
            update_item_details_in_db(item_id, item_details)
        else:
            logger.warning(f"Item ID {item_id} 상세 정보를 가져오지 못했습니다 (API 결과가 None).")
        
        time.sleep(1) # API 호출 제한 준수를 위한 대기 (get_item_info 내부에도 있을 수 있으나 추가)
        return True 
    except Exception as e:
        logger.error(f"Item ID {item_id} 상세 정보 처리 중 오류: {e}", exc_info=True)
        # stats.increment('api_errors') # get_item_info 내부에서 이미 처리될 수 있음
        return False

def update_all_missing_item_info():
    """item_obj가 없거나 이름 정보가 없는 아이템들의 상세 정보를 업데이트합니다."""
    if shutdown_requested:
        logger.info("종료 요청으로 아이템 정보 업데이트 작업을 건너뜁니다.")
        return
    
    if not auctions_collection:
        logger.error("MongoDB auctions_collection이 초기화되지 않아 아이템 정보 업데이트를 시작할 수 없습니다.")
        return

    logger.info("아이템 상세 정보 업데이트 작업 시작...")
    token = None
    try:
        token = get_access_token()
        logger.info(f"아이템 정보 업데이트용 API 토큰 발급 완료: {token[:10]}...")
    except Exception as e:
        logger.error(f"아이템 정보 업데이트용 API 토큰 발급 실패: {e}")
        return

    try:
        # item_obj가 없거나, item_obj.name이 없는 (Blizzard API 기준) 아이템들의 item_id 목록 조회
        # 실제 Blizzard API 응답에서 아이템 이름 필드 경로를 확인해야 합니다. 예: 'name.ko_KR'
        # 여기서는 item_obj 자체가 없거나, item_obj 안에 name 필드가 없는 경우를 가정합니다.
        # 또는, 프론트엔드에서 "이름 없음"으로 표시될 만한 특정 조건으로 필터링 할 수도 있습니다.
        # 일단은 item_obj가 없는 문서들만 대상으로 하겠습니다. (더 구체적인 조건 추가 가능)
        missing_info_items_cursor = auctions_collection.find(
            {'$or': [{'item_obj': {'$exists': False}}, {'item_obj': None}]}, # 또는 {'item_obj.name': {'$exists': False}} 등
            {'item_id': 1, '_id': 0} # item_id만 가져옴
        )
        
        distinct_item_ids = set()
        for item_doc in missing_info_items_cursor:
            if 'item_id' in item_doc and item_doc['item_id'] is not None:
                distinct_item_ids.add(item_doc['item_id'])
        
        if not distinct_item_ids:
            logger.info("업데이트가 필요한 아이템 정보가 없습니다.")
            return

        total_ids_to_update = len(distinct_item_ids)
        logger.info(f"총 {total_ids_to_update}개의 고유한 item_id에 대한 정보 업데이트 시도...")

        updated_count = 0
        failed_count = 0
        for i, item_id in enumerate(list(distinct_item_ids)):
            if shutdown_requested:
                logger.info("종료 요청으로 아이템 정보 업데이트를 중단합니다.")
                break
            logger.info(f"[{i+1}/{total_ids_to_update}] Item ID {item_id} 처리 중...")
            if fetch_and_update_single_item_info(item_id, token):
                updated_count +=1
            else:
                failed_count +=1
        
        logger.info(f"아이템 상세 정보 업데이트 작업 완료. 성공: {updated_count} ID, 실패: {failed_count} ID")

    except Exception as e:
        logger.error(f"아이템 상세 정보 업데이트 작업 중 오류 발생: {e}", exc_info=True)
    finally:
        stats.log_stats() # 작업 후 통계 로깅

def collect_auction_data():
    """Blizzard API에서 경매장 데이터를 수집하여 MongoDB에 저장"""
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
                        
                        # MongoDB에 저장
                        if auctions_data and 'auctions' in auctions_data:
                            save_auctions_to_mongodb(connected_realm_id, auctions_data['auctions'], collection_time)
                        else:
                            logger.warning(f"Realm ID {connected_realm_id}에서 유효한 경매 데이터를 받지 못했습니다.")
                        
                        logger.info(f"Realm ID {connected_realm_id} 데이터 처리 완료")
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
    """특정 Realm에 대해 Blizzard API에서 경매장 데이터를 수집하여 MongoDB에 저장"""
    if shutdown_requested:
        logger.info("종료 요청으로 데이터 수집 작업을 건너뜁니다.")
        return
    
    try:
        with Timer(f"Realm {realm_id} 데이터 수집"):
            logger.info(f"Realm ID {realm_id} 데이터 수집 시작")
            
            # Blizzard API 토큰 발급
            token = get_access_token()
            logger.info(f"API 토큰 발급 완료: {token[:10]}...")
            
            # 경매 데이터 가져오기
            auctions_data = get_auctions(token, realm_id)
            
            # 현재 timestamp 추가
            collection_time = datetime.now().isoformat()
            
            # MongoDB에 저장
            if auctions_data and 'auctions' in auctions_data:
                save_auctions_to_mongodb(realm_id, auctions_data['auctions'], collection_time)
            else:
                logger.warning(f"Realm ID {realm_id}에서 유효한 경매 데이터를 받지 못했습니다.")
            
            # 성능 통계 로깅
            stats.log_stats()
            logger.info(f"Realm ID {realm_id} 데이터 수집 완료")
        
    except Exception as e:
        logger.error(f"Realm ID {realm_id} 데이터 수집 중 오류 발생: {str(e)}", exc_info=True)

def health_check():
    """애플리케이션 상태 확인 및 보고"""
    try:
        logger.info("상태 확인 시작")
        
        # 성능 통계 조회
        app_stats = stats.get_stats()
        
        logger.info(f"상태 확인 결과: 정상 작동 중 (MongoDB 연결: {'성공' if mongo_client else '실패'}), " +
                   f"API 호출: {app_stats['api_calls']}회, 오류: {app_stats['api_errors']}회, " +
                   f"DB 작업: {app_stats['db_operations']}회, 오류: {app_stats['db_errors']}회")
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
    
    # 아이템 상세 정보 업데이트 스케줄 설정 (예: 6시간마다)
    # 실제 운영 환경에 맞게 주기 조정 필요
    schedule.every(1).hours.do(update_all_missing_item_info) 
    
    # 상태 확인 스케줄 설정
    schedule.every(30).minutes.do(health_check)
    
    # 처음 실행 시 즉시 한 번 실행
    logger.info("첫 번째 데이터 수집 시작")
    collect_auction_data()
    # 애플리케이션 시작 시 아이템 정보 업데이트도 한 번 실행할 수 있습니다 (선택 사항).
    # logger.info("첫 번째 아이템 정보 업데이트 시작")
    # update_all_missing_item_info()
    
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
        
        # DB 객체 전달
        if db is not None and auctions_collection is not None:
            health_server.set_db_objects(db, auctions_collection)
        else:
            logger.warning("main: DB 객체가 초기화되지 않아 health_server에 전달할 수 없습니다.")
            
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