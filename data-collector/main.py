import os
import time
import schedule
import logging
import signal
import sys
from datetime import datetime, timedelta

from logger_config import setup_logger, get_logger
from blizzard_api import get_access_token, get_connected_realms, get_auctions, get_item_info, get_item_media, get_commodities_auctions
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
BLIZZARD_REGION = os.getenv('BLIZZARD_REGION', 'kr') # 지역 코드

# 종료 플래그
shutdown_requested = False

# MongoDB 클라이언트 및 컬렉션 초기화
mongo_client = None
db = None
auctions_collection = None
item_metadata_collection = None  # 아이템 메타데이터를 저장할 컬렉션

# 메타데이터 처리 대기열
new_item_ids_queue = set()

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
        item_metadata_collection = db["item_metadata"]  # 아이템 메타데이터를 저장할 컬렉션
        logger.info(f"MongoDB 연결 성공: Database: {db.name}, Collection: {auctions_collection.name}, Item Metadata Collection: {item_metadata_collection.name}")
    except Exception as e:
        logger.error(f"MongoDB 연결 실패: {e}", exc_info=True)
        mongo_client = None # 연결 실패 시 None으로 설정
        # 연결 실패 시 컬렉션 객체도 None으로 명시적 설정
        auctions_collection = None
        item_metadata_collection = None

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
        logger.info(f"ID {realm_id}에 대한 경매 데이터가 없어 저장하지 않습니다.")
        return

    # 발견된 모든 아이템 ID 기록 (나중에 메타데이터 조회용)
    unique_item_ids = set()
    
    items_to_insert = []
    for auction in auctions_data_list:
        item_id_val = None
        # Blizzard API 응답에서 item 객체 내의 id를 item_id로 사용
        if isinstance(auction.get('item'), dict) and 'id' in auction['item']:
            item_id_val = auction['item']['id']
            # 발견된 아이템 ID 기록
            if item_id_val:
                unique_item_ids.add(item_id_val)
        
        document = {
            'blizzard_auction_id': auction.get('id'), # 블리자드 경매 ID
            'item_id': item_id_val,
            'item_obj': auction.get('item'), # 아이템 기본 정보 (API 응답 그대로)
            'buyout': auction.get('buyout'),
            'quantity': auction.get('quantity'),
            'time_left': auction.get('time_left'),
            'realm_id': realm_id, # int 또는 str 타입 그대로 저장
            'collection_time': collection_time, # ISO 형식 문자열
            # 'last_modified_timestamp': auction.get('last_modified_timestamp') # API 응답에 있다면 추가
        }
        items_to_insert.append(document)

    if not items_to_insert:
        logger.info(f"ID {realm_id}에 MongoDB에 저장할 가공된 데이터가 없습니다.")
        return

    try:
        with Timer(f"MongoDB 저장 (ID: {realm_id})"):
            # 1. 해당 realm_id의 기존 데이터 삭제
            delete_result = auctions_collection.delete_many({'realm_id': realm_id})
            logger.info(f"ID {realm_id}의 기존 경매 데이터 {delete_result.deleted_count}건 삭제 완료.")
            stats.increment('db_operations')

            # 2. 새로운 데이터 삽입
            if items_to_insert: # 삽입할 아이템이 있을 경우에만 실행
                insert_result = auctions_collection.insert_many(items_to_insert)
                logger.info(f"ID {realm_id}에 {len(insert_result.inserted_ids)}건의 경매 데이터 MongoDB 저장 완료.")
                stats.increment('db_operations', len(insert_result.inserted_ids))
                # stats.increment('items_processed_db', len(items_to_insert)) # items_processed와 중복될 수 있어 일단 주석
            else:
                logger.info(f"ID {realm_id}에 MongoDB에 삽입할 최종 아이템이 없습니다.")

            # 3. 새로 발견된 아이템 ID에 대해 메타데이터 조회 필요 여부 확인 및 백그라운드 처리
            if unique_item_ids:
                logger.info(f"ID {realm_id}에서 총 {len(unique_item_ids)}개의 고유 아이템 ID가 발견되었습니다.")
                # 여기서는 백그라운드에서 처리를 예약만 하고, 실제 처리는 다른 함수에서 수행
                process_new_item_metadata(unique_item_ids)
                
    except Exception as e:
        logger.error(f"ID {realm_id} 데이터 MongoDB 저장 중 오류 발생: {e}", exc_info=True)
        stats.increment('db_errors')

def update_item_details_in_db(item_id: int, item_details: dict):
    """특정 item_id에 해당하는 모든 경매 문서의 item_obj를 업데이트합니다."""
    if auctions_collection is None:
        logger.error("MongoDB auctions_collection이 초기화되지 않아 아이템 상세 정보를 업데이트할 수 없습니다.")
        return 0
    if not item_details:
        logger.warning(f"Item ID {item_id}에 대한 상세 정보가 비어 있어 업데이트하지 않습니다.")
        return 0

    try:
        # 아이템 이름이 없는 경우 로그 출력
        if 'name' not in item_details:
            logger.warning(f"Item ID {item_id}의 응답에 name 필드가 없습니다: {item_details}")
            return 0
            
        # 이름이 있는 경우 업데이트 진행
        # item_obj 전체를 설정하고, 별도로 item_name 필드 추가
        item_name = item_details.get('name')
        result = auctions_collection.update_many(
            {'item_id': item_id},
            {'$set': {
                'item_obj': item_details,  # item_obj 전체 업데이트 (name 포함)
                'item_name': item_name     # 루트 레벨에 이름 필드 추가
            }}
        )
        if result.modified_count > 0:
            logger.info(f"Item ID {item_id} ({item_name}): {result.modified_count}개 문서의 item_obj 업데이트 완료.")
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
            # 예: name, quality 같은 중요 필드를 루트 레벨로 추출
            if 'name' in item_details:
                # 필요한 정보를 item_obj에 직접 추가
                item_details_enhanced = item_details.copy()
                # 기존 응답 구조 유지하면서 추가 필드 보강
                update_item_details_in_db(item_id, item_details_enhanced)
                logger.info(f"Item ID {item_id} '{item_details.get('name', '이름 없음')}' 정보 업데이트 완료")
                return True
            else:
                logger.warning(f"Item ID {item_id} 상세 정보에 name 필드가 없습니다.")
                update_item_details_in_db(item_id, item_details)
                return True
        else:
            logger.warning(f"Item ID {item_id} 상세 정보를 가져오지 못했습니다 (API 결과가 None).")
        
        time.sleep(2) # API 호출 제한 준수를 위한 대기 (get_item_info 내부에도 있음 - 추가 여유 확보)
        return False 
    except Exception as e:
        logger.error(f"Item ID {item_id} 상세 정보 처리 중 오류: {e}", exc_info=True)
        # stats.increment('api_errors') # get_item_info 내부에서 이미 처리될 수 있음
        return False

def update_all_missing_item_info():
    """item_obj가 없거나 이름 정보가 없는 아이템들의 상세 정보를 업데이트합니다."""
    if shutdown_requested:
        logger.info("종료 요청으로 아이템 정보 업데이트 작업을 건너뜁니다.")
        return
    
    if auctions_collection is None:
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
        # item_obj가 없거나, name 필드가 없는 아이템 대상으로 확장
        missing_info_items_cursor = auctions_collection.find(
            {'$or': [
                {'item_obj': {'$exists': False}}, 
                {'item_obj': None},
                {'item_obj.name': {'$exists': False}},  # name 필드가 없는 경우도 포함
                {'item_obj.id': {'$exists': True, '$ne': None}, 'item_obj.name': {'$exists': False}}  # id는 있지만 name이 없는 항목
            ]},
            {'item_id': 1, '_id': 0} # item_id만 가져옴
        )
        
        distinct_item_ids = set()
        for item_doc in missing_info_items_cursor:
            if 'item_id' in item_doc and item_doc['item_id'] is not None:
                distinct_item_ids.add(item_doc['item_id'])
        
        if not distinct_item_ids:
            logger.info("업데이트가 필요한 아이템 정보가 없습니다.")
            return

        # 전체 아이템 ID 목록
        all_item_ids = list(distinct_item_ids)
        total_ids_to_update = len(all_item_ids)
        
        # 한 번에 처리할 아이템 수를 1개로 제한 (API 제한 고려)
        batch_size = 1
        ids_to_process = all_item_ids[:batch_size]
        
        logger.info(f"총 {total_ids_to_update}개 아이템 중 이번 실행에서 {len(ids_to_process)}개 아이템 정보 업데이트 시도...")

        updated_count = 0
        failed_count = 0
        for i, item_id in enumerate(ids_to_process):
            if shutdown_requested:
                logger.info("종료 요청으로 아이템 정보 업데이트를 중단합니다.")
                break
            logger.info(f"[{i+1}/{len(ids_to_process)}] Item ID {item_id} 처리 중...")
            if fetch_and_update_single_item_info(item_id, token):
                updated_count +=1
            else:
                failed_count +=1
            
            # API 호출 사이에 약간의 시간 간격 추가 (블리자드 API 제한 준수)
            time.sleep(1)
        
        remaining = total_ids_to_update - len(ids_to_process)
        logger.info(f"아이템 상세 정보 업데이트 작업 완료. 성공: {updated_count} ID, 실패: {failed_count} ID, 남은 아이템: {remaining}개")

    except Exception as e:
        logger.error(f"아이템 상세 정보 업데이트 작업 중 오류 발생: {e}", exc_info=True)
    finally:
        stats.log_stats() # 작업 후 통계 로깅

def collect_auction_data():
    """전체 지역의 상품 경매 데이터를 수집합니다."""
    if shutdown_requested:
        logger.info("종료 요청으로 상품 경매 데이터 수집을 건너뜁니다.")
        return

    logger.info("상품 경매 데이터 수집 시작...")
    token = None
    try:
        with Timer("OAuth 토큰 발급"):
            token = get_access_token()
        if not token:
            logger.error("OAuth 토큰 발급에 실패하여 상품 경매 데이터 수집을 중단합니다.")
            return
        logger.info(f"OAuth 토큰 발급 성공 (상품 경매용): {token[:10]}...")
    except Exception as e:
        logger.error(f"OAuth 토큰 발급 중 오류 발생 (상품 경매용): {e}", exc_info=True)
        return

    try:
        with Timer("상품 경매 데이터 API 호출"):
            commodities_data = get_commodities_auctions(token) # blizzard_api.py의 함수 사용
        
        if commodities_data and 'auctions' in commodities_data:
            auctions_list = commodities_data['auctions']
            collection_time_iso = datetime.utcnow().isoformat()
            
            # 상품 데이터의 경우 특별한 realm_id 사용 (예: "commodities_kr")
            commodities_identifier = f"commodities_{BLIZZARD_REGION}"
            
            logger.info(f"{commodities_identifier}에서 {len(auctions_list)}개의 상품 경매 데이터 수신.")
            save_auctions_to_mongodb(commodities_identifier, auctions_list, collection_time_iso)
            stats.increment('collections_completed_total')
        else:
            logger.warning("상품 경매 데이터를 가져오지 못했거나 데이터 형식이 올바르지 않습니다.")
            stats.increment('collections_failed_total')

    except Exception as e:
        logger.error(f"상품 경매 데이터 수집 중 오류 발생: {e}", exc_info=True)
        stats.increment('collections_failed_total')
    finally:
        logger.info("상품 경매 데이터 수집 완료.")

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
    
    # 아이템 메타데이터 처리 스케줄 설정 (10초마다)
    schedule.every(2).seconds.do(process_item_metadata_queue)
    
    # 상태 확인 스케줄 설정
    schedule.every(30).minutes.do(health_check)
    
    # 처음 실행 시 즉시 한 번 실행
    logger.info("첫 번째 데이터 수집 시작")
    collect_auction_data()
    
    logger.info("스케줄러 시작됨")
    
    # 스케줄러 무한 루프
    while not shutdown_requested:
        schedule.run_pending()
        time.sleep(1)  # 1초마다 스케줄 확인 (3초 간격 일정을 위해 변경)
    
    logger.info("종료 요청으로 스케줄러 종료")

def get_item_metadata(item_id):
    """
    아이템 메타데이터를 컬렉션에서 조회합니다.
    없으면 None을 반환합니다.
    """
    if item_metadata_collection is None:
        logger.warning("Item metadata collection is not initialized.")
        return None
    
    try:
        return item_metadata_collection.find_one({"item_id": item_id})
    except Exception as e:
        logger.error(f"아이템 메타데이터 조회 중 오류: {e}", exc_info=True)
        return None

def save_item_metadata(item_id, item_details, item_media_details=None):
    """아이템 메타데이터와 미디어 정보를 MongoDB에 저장합니다."""
    if item_metadata_collection is None:
        logger.error("MongoDB item_metadata_collection이 초기화되지 않아 아이템 메타데이터를 저장할 수 없습니다.")
        stats.increment('db_errors')
        return

    if not item_details or not isinstance(item_details, dict):
        logger.warning(f"Item ID {item_id}에 대한 상세 정보가 유효하지 않아 저장하지 않습니다.")
        return

    # 아이콘 URL 추출 로직 (제공된 이미지 기반으로 수정)
    icon_url = None
    if item_media_details and isinstance(item_media_details, dict):
        assets = item_media_details.get('assets')
        if isinstance(assets, list): # 이전 로직: assets가 배열인 경우
            for asset_item in assets:
                if isinstance(asset_item, dict) and asset_item.get('key') == 'icon' and 'value' in asset_item:
                    icon_url = asset_item['value']
                    logger.info(f"Item ID {item_id}의 아이콘 URL 추출 (리스트 내 객체): {icon_url}")
                    break
        elif isinstance(assets, dict): # 새로운 로직: assets가 단일 객체인 경우
            if assets.get('key') == 'icon' and 'value' in assets:
                icon_url = assets['value']
                logger.info(f"Item ID {item_id}의 아이콘 URL 추출 (단일 객체): {icon_url}")
        # 경우에 따라 item_media_details 자체가 icon 정보를 담고 있을 수도 있음 (가장 바깥 레벨)
        elif item_media_details.get('key') == 'icon' and 'value' in item_media_details: 
             icon_url = item_media_details['value']
             logger.info(f"Item ID {item_id}의 아이콘 URL 추출 (루트 객체): {icon_url}")


    if not icon_url:
        # assets가 없는 경우 또는 icon 타입이 아닌 다른 타입의 asset만 있는 경우도 고려
        # 예시: item_media_details = {"id": 123} 또는 {"assets": {"key": "zoom", "value": "..."}}
        logger.warning(f"Item ID {item_id}의 아이콘 URL을 찾지 못했습니다. Media Details: {item_media_details}")

    # 저장할 문서 생성 (기존 item_details의 주요 필드와 icon_url 포함)
    # item_details가 API 응답 그대로라면 필요한 필드만 선택적으로 저장하는 것이 좋음
    # 예시: name, quality, item_level, required_level, item_class, item_subclass 등
    metadata_doc = {
        '_id': item_id,  # item_id를 MongoDB의 _id로 사용
        'item_id': item_id,
        'name': item_details.get('name'),
        'quality': item_details.get('quality', {}).get('name', {}).get('ko_KR') if isinstance(item_details.get('quality'), dict) and isinstance(item_details.get('quality', {}).get('name'), dict) else item_details.get('quality', {}).get('type'), # 품질 (ko_KR 우선, 없으면 type)
        'item_level': item_details.get('level'),
        'required_level': item_details.get('required_level'),
        'item_class': item_details.get('item_class', {}).get('name', {}).get('ko_KR') if isinstance(item_details.get('item_class'), dict) and isinstance(item_details.get('item_class', {}).get('name'), dict) else None, # 아이템 분류 (ko_KR)
        'item_subclass': item_details.get('item_subclass', {}).get('name', {}).get('ko_KR') if isinstance(item_details.get('item_subclass'), dict) and isinstance(item_details.get('item_subclass', {}).get('name'), dict) else None, # 아이템 하위 분류 (ko_KR)
        'inventory_type': item_details.get('inventory_type', {}).get('name', {}).get('ko_KR') if isinstance(item_details.get('inventory_type'), dict) and isinstance(item_details.get('inventory_type', {}).get('name'), dict) else None, # 착용 부위 (ko_KR)
        'purchase_price': item_details.get('purchase_price'),
        'sell_price': item_details.get('sell_price'),
        'is_equippable': item_details.get('is_equippable'),
        'is_stackable': item_details.get('is_stackable'),
        'max_count': item_details.get('max_count'),
        'icon_url': icon_url, # 필드명을 iconUrl에서 icon_url로 변경
        'blizzard_item_details': item_details, # 원본 API 응답 보관 (선택적)
        'blizzard_item_media_details': item_media_details, # 원본 미디어 API 응답 보관 (선택적)
        'last_updated': datetime.utcnow().isoformat() + 'Z' # UTC 시간으로 마지막 업데이트 시간 기록
    }

    try:
        with Timer(f"MongoDB 아이템 메타데이터 저장 (Item ID: {item_id})"):
            # update_one을 사용하여 이미 문서가 있으면 덮어쓰고, 없으면 새로 삽입 (upsert=True)
            update_result = item_metadata_collection.update_one(
                {'_id': item_id},
                {'$set': metadata_doc},
                upsert=True
            )
            stats.increment('db_operations')
            if update_result.upserted_id:
                logger.info(f"Item ID {item_id} 메타데이터 새로 저장 완료.")
            elif update_result.modified_count > 0:
                logger.info(f"Item ID {item_id} 메타데이터 업데이트 완료.")
            else:
                logger.info(f"Item ID {item_id} 메타데이터 변경 사항 없음.")

    except Exception as e:
        logger.error(f"Item ID {item_id} 메타데이터 MongoDB 저장 중 오류 발생: {e}", exc_info=True)
        stats.increment('db_errors')

def fetch_missing_item_metadata(item_id):
    """DB에 없는 아이템 메타데이터를 Blizzard API에서 가져와 저장합니다."""
    if shutdown_requested:
        logger.info("종료 요청으로 아이템 메타데이터 조회를 건너뜁니다.")
        return False

    # 1. DB에 이미 있는지 확인 (이름과 아이콘 URL 모두 있는지 확인)
    existing_metadata = get_item_metadata(item_id)
    if existing_metadata and existing_metadata.get('name') and existing_metadata.get('icon_url'):
        logger.debug(f"Item ID {item_id} 메타데이터 ('{existing_metadata.get('name')}')가 이미 DB에 존재하며 아이콘 URL도 있습니다. 건너뜁니다.")
        return True # 이미 처리됨

    logger.info(f"Item ID {item_id} 메타데이터 조회 및 저장 시작 (기존 데이터: 이름만 있거나 아이콘 없음)...")
    token = None
    try:
        token = get_access_token()
    except Exception as e:
        logger.error(f"메타데이터 조회용 API 토큰 발급 실패 (Item ID: {item_id}): {e}")
        return False

    item_details = None
    item_media_details = None
    success = False

    try:
        # 2. 아이템 기본 정보 가져오기 (기존에 이름만 있었을 수도 있으니 다시 가져옴)
        item_details = get_item_info(token, item_id)
        if not item_details or 'name' not in item_details:
            logger.warning(f"Item ID {item_id}의 기본 정보를 가져오지 못했거나 이름이 없습니다. 메타데이터를 저장할 수 없습니다.")
            return False 

        # 3. 아이템 미디어 정보 가져오기 (아이콘 URL)
        # 기존에 아이콘이 없었거나, 아이템 정보가 아예 없었을 경우에만 호출
        if not (existing_metadata and existing_metadata.get('icon_url')):
            item_media_details = get_item_media(token, item_id)
            if not item_media_details:
                logger.warning(f"Item ID {item_id}의 미디어 정보를 가져오지 못했습니다. 아이콘 없이 저장될 수 있습니다.")
        elif existing_metadata and existing_metadata.get('icon_url'):
             # 이미 아이콘 URL이 있는 경우, media details는 기존 것을 사용하거나 None으로 둘 수 있음.
             # 여기서는 save_item_metadata가 item_media_details=None을 처리하므로, 다시 호출할 필요 없음.
             logger.debug(f"Item ID {item_id}는 이미 아이콘 URL이 있으므로 미디어 API를 다시 호출하지 않습니다.")

        # 4. DB에 저장
        save_item_metadata(item_id, item_details, item_media_details) # item_media_details 전달
        success = True

    except Exception as e:
        logger.error(f"Item ID {item_id} 메타데이터 처리 중 오류: {e}", exc_info=True)
    
    return success

def process_new_item_metadata(item_ids):
    """새로 발견된 아이템 ID 목록에 대해 메타데이터 처리를 대기열에 추가합니다."""
    global new_item_ids_queue
    if item_metadata_collection is None:
        logger.warning("item_metadata_collection이 초기화되지 않아 새 아이템 ID를 처리할 수 없습니다.")
        return

    added_to_queue_count = 0
    for item_id in item_ids:
        if item_id is None: continue
        # DB에 해당 item_id의 메타데이터가 이미 있고, icon_url도 있는지 확인
        # (이름만 체크하면 아이콘 없는 경우 다시 시도하도록) -> fetch_missing_item_metadata에서 icon_url도 체크하도록 변경
        existing = item_metadata_collection.count_documents({"item_id": item_id, "icon_url": {"$exists": True, "$ne": None}})
        if existing == 0:
            if item_id not in new_item_ids_queue:
                new_item_ids_queue.add(item_id)
                added_to_queue_count += 1
        # else: # 이미 DB에 있고 아이콘도 있는 경우 (디버그용)
            # logger.debug(f"Item ID {item_id}는 이미 메타데이터(아이콘 포함)가 있어 대기열에 추가하지 않음.")
            
    if added_to_queue_count > 0:
        logger.info(f"{added_to_queue_count}개의 새 아이템 ID를 메타데이터 처리 대기열에 추가했습니다. 현재 대기열 크기: {len(new_item_ids_queue)}")

def process_item_metadata_queue():
    """
    대기열에 있는 아이템 ID의 메타데이터를 처리합니다.
    이 함수는 주기적으로 스케줄러에 의해 호출됩니다.
    """
    global new_item_ids_queue
    
    if shutdown_requested:
        logger.info("종료 요청으로 아이템 메타데이터 처리를 건너뜁니다.")
        return
    
    if not new_item_ids_queue:
        # 처리할 아이템이 없으면 로그를 남기지 않고 종료
        return
    
    logger.info(f"아이템 메타데이터 처리 시작. 대기열 크기: {len(new_item_ids_queue)}")
    
    # 최대 몇 개의 아이템을 한 번에 처리할지 설정 (API 호출 제한 고려)
    batch_size = int(os.getenv('METADATA_BATCH_SIZE', '3')) # 환경 변수 또는 기본값 3
    processed_count = 0
    successful_fetches = 0
    failed_fetches = 0
    
    # 대기열에서 처리할 아이템 ID 일부 추출 (복사본 사용)
    # new_item_ids_queue는 set이므로 순서 보장 안됨. list로 변환 후 슬라이싱
    items_to_process_this_run = list(new_item_ids_queue)[:batch_size]

    if not items_to_process_this_run:
        return # 처리할 것이 없으면 바로 종료

    logger.info(f"이번 실행에서 처리할 메타데이터 아이템 수: {len(items_to_process_this_run)}")

    for item_id in items_to_process_this_run:
        if shutdown_requested:
            logger.info("종료 요청으로 아이템 메타데이터 처리 중단.")
            break
        
        # 아이템 처리 시도
        try:
            logger.info(f"대기열에서 Item ID {item_id} 메타데이터 처리 시도...")
            if fetch_missing_item_metadata(item_id):
                successful_fetches += 1
            else:
                # fetch_missing_item_metadata 내부에서 오류 로깅 및 실패 원인(예: API 404) 처리
                # 여기서는 실패 카운트만 증가.
                failed_fetches +=1
        except Exception as e: # fetch_missing_item_metadata 내에서 발생하는 예외를 여기서도 캐치
            logger.error(f"Item ID {item_id} 메타데이터 처리 중 예외 발생 (큐 처리): {e}", exc_info=True)
            failed_fetches += 1
        finally:
            # 성공/실패 여부와 관계없이 큐에서 제거 (재시도는 다음 큐 처리 시점에 다른 아이템들과 함께)
            if item_id in new_item_ids_queue: # 다시 한번 확인 (다른 스레드에서 제거했을 수도 있음)
                new_item_ids_queue.remove(item_id)
            processed_count += 1
            # API 호출 간격 제어 (fetch_missing_item_metadata 내부에 이미 있음)
            # time.sleep(1) # 각 아이템 처리 후 짧은 대기

    if processed_count > 0:
        logger.info(f"아이템 메타데이터 처리 완료: 총 {processed_count}개 시도, {successful_fetches}개 성공, {failed_fetches}개 실패. 남은 대기열: {len(new_item_ids_queue)}")

def delete_old_auctions():
    """오래된 경매 데이터 삭제"""
    if auctions_collection is None:
        logger.error("MongoDB auctions_collection이 초기화되지 않아 오래된 데이터를 삭제할 수 없습니다.")
        return
    
    if DATA_RETENTION_DAYS <= 0:
        logger.warning("DATA_RETENTION_DAYS가 0 이하이므로 오래된 데이터를 삭제하지 않습니다.")
        return

    # 현재 시간에서 오래된 데이터의 기준 시간 계산
    cutoff_time = datetime.now() - timedelta(days=DATA_RETENTION_DAYS)

    try:
        with Timer("오래된 경매 데이터 삭제"):
            # 오래된 데이터 찾기
            delete_result = auctions_collection.delete_many({
                'collection_time': {'$lt': cutoff_time.isoformat()}
            })
            logger.info(f"총 {delete_result.deleted_count}건의 오래된 경매 데이터 삭제 완료.")
            stats.increment('db_operations', delete_result.deleted_count)
    except Exception as e:
        logger.error(f"오래된 경매 데이터 삭제 중 오류 발생: {e}", exc_info=True)
        stats.increment('db_errors')

if __name__ == "__main__":
    try:
        logger.info("WoW 경매장 데이터 수집기 시작")
        
        # 헬스체크 서버 시작
        health_server.start()
        
        # DB 객체 전달
        if db is not None and auctions_collection is not None:
            health_server.set_db_objects(db, auctions_collection, item_metadata_collection)
        else:
            logger.warning("main: DB 객체가 초기화되지 않아 health_server에 전달할 수 없습니다.")
            
        # 데이터 수집 함수 등록
        health_server.set_collect_function(collect_auction_data)
        health_server.set_realm_collect_function(collect_realm_auction_data)
        
        # 아이템 정보 업데이트 함수 등록
        health_server.set_item_update_function(update_all_missing_item_info)
        
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