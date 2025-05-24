import os
import threading
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
import logging
from monitoring import stats
import urllib.parse
import pymongo
from datetime import datetime, timedelta
import time

# blizzard_api에서 함수 import
from blizzard_api import get_access_token, get_item_media, get_commodities_auctions # get_item_media 추가

# collect_auction_data 함수 import (main.py에 있는 함수)
# 순환 import 방지를 위해 함수 참조만 저장
collect_data_func = None
collect_realm_data_func = None
update_item_info_func = None  # 아이템 정보 업데이트 함수

# main.py로부터 전달받을 DB 객체
db = None
auctions_collection = None
item_metadata_collection = None  # 아이템 메타데이터 컬렉션 추가

# 로거 설정
logger = logging.getLogger('data-collector.health_server')

# 기본 포트 설정
DEFAULT_PORT = int(os.getenv('HEALTH_PORT', '8080'))

# MongoDB 클라이언트 초기화
MONGODB_URI = os.getenv("MONGODB_URI")
mongo_client = None
if MONGODB_URI:
    try:
        mongo_client = pymongo.MongoClient(MONGODB_URI, serverSelectionTimeoutMS=3000)
        logger.info("MongoDB 연결 성공")
    except Exception as e:
        logger.error(f"MongoDB 연결 실패: {e}")

# 인메모리 경매 데이터 캐시
# 구조: { realm_id: { "data": [아이템 목록], "total_count": N, "last_updated": datetime } }
g_auction_data_cache = {}
CACHE_TTL_SECONDS = 3000  # 캐시 유효 시간 (예: 5분)

def update_auction_data_cache(entity_id: str | int):
    """특정 엔티티(realm 또는 commodities)의 경매 데이터를 DB에서 읽어와 캐시를 업데이트합니다."""
    global g_auction_data_cache, auctions_collection, item_metadata_collection, logger
    logger.info(f"[{entity_id}] 캐시 업데이트 시작...")
    try:
        # 상품 데이터인지 일반 realm 데이터인지에 따라 필드명 및 매치 조건 조정 가능성 있었으나,
        # 현재 DB 저장 시 unit_price로 통일되었으므로 match 조건은 realm_id만 사용.
        # realm_id 필드는 숫자(서버 ID) 또는 문자열("commodities_xx")일 수 있음.
        match_query = {"realm_id": entity_id, "unit_price": {"$exists": True, "$ne": None, "$gt": 0}}
        
        # item 객체 내의 id 필드를 item_id로 사용하고, 해당 item_id로 그룹화합니다.
        # unit_price를 사용 (buyout 대신)
        pipeline = [
            {"$match": match_query},
            {"$sort": {"item.id": 1, "unit_price": 1, "collection_time": -1}},
            {
                "$group": {
                    "_id": "$item.id", # item 객체 내의 id로 그룹화
                    "representative_auction": {"$first": "$$ROOT"}
                }
            },
            {"$replaceRoot": {"newRoot": "$representative_auction"}},
            {
                "$lookup": {
                    "from": item_metadata_collection.name if item_metadata_collection is not None else "item_metadata",
                    "localField": "item.id", # item 객체 내의 id를 사용
                    "foreignField": "item_id",
                    "as": "item_meta_docs"
                }
            },
            {
                "$addFields": {
                    "item_meta": {"$arrayElemAt": ["$item_meta_docs", 0]},
                }
            },
            {
                "$addFields": {
                    # item 객체 내의 id를 문자열로 변환하여 아이템 이름 생성에 사용
                    "item_name": {"$ifNull": ["$item_meta.name", {"$concat": ["아이템 #", {"$toString": "$item.id"}]}]},
                    "item_quality": {"$ifNull": ["$item_meta.quality", "common"]},
                    "icon_url": {"$ifNull": ["$item_meta.icon_url", None]}
                }
            },
            {"$project": {"item_meta_docs": 0, "item_meta": 0}},
            {"$sort": {"item_name": 1}}
        ]
        
        all_auctions = list(auctions_collection.aggregate(pipeline))
        # ObjectId를 문자열로 변환하는 로직은 유지 (JSON 직렬화 위함)
        for doc in all_auctions:
            if '_id' in doc and not isinstance(doc['_id'], (str, int, float)):
                doc['_id'] = str(doc['_id'])

        current_time = datetime.now()
        g_auction_data_cache[entity_id] = {
            "data": all_auctions,
            "total_count": len(all_auctions),
            "last_updated": current_time
        }
        logger.info(f"[{entity_id}] 캐시 업데이트 완료. 총 {len(all_auctions)}개 아이템 캐시됨.")
        return g_auction_data_cache[entity_id]
    except Exception as e:
        logger.error(f"[{entity_id}] 캐시 업데이트 중 오류: {e}", exc_info=True)
        return None

class HealthRequestHandler(BaseHTTPRequestHandler):
    """헬스체크 및 상태 정보 제공을 위한 HTTP 핸들러"""
    
    def _set_headers(self, status_code=200, content_type='application/json'):
        """응답 헤더 설정"""
        self.send_response(status_code)
        self.send_header('Content-type', content_type)
        self.end_headers()
    
    def do_GET(self):
        """GET 요청 처리"""
        parsed_path = urllib.parse.urlparse(self.path)
        path = parsed_path.path
        query_params = urllib.parse.parse_qs(parsed_path.query)
        
        # /auctions/{realmId} 패턴 매칭
        auctions_path_match = path.startswith('/auctions/')
        if auctions_path_match:
            realm_id = path.split('/auctions/')[1]
            # query_params에 realm_id 추가
            query_params['realm_id'] = [realm_id]
            self._handle_auctions(query_params)
            return
        
        if path == '/health': # 헬스체크 엔드포인트
            self._handle_health_check()
        elif path == '/metrics': # 성능 지표 엔드포인트
            self._handle_metrics()
        elif path == '/collect': # 데이터 수집 엔드포인트
            self._handle_collect(query_params)
        elif path == '/db-status': # MongoDB 상태 엔드포인트
            self._handle_db_status()
        elif path == '/auctions-by-itemid': # 특정 아이템 ID의 경매 데이터 엔드포인트
            self._handle_auctions_by_itemid(query_params)
        elif path == '/realms': # 모든 렐름 목록 엔드포인트
            self._handle_realms()
        elif path == '/item-update': # 아이템 정보 업데이트 엔드포인트
            self._handle_item_update(query_params)
        elif path == '/item-metadata': # 아이템 메타데이터 엔드포인트
            self._handle_item_metadata(query_params)
        elif path == '/item-media': # 새로운 엔드포인트 추가
            self._handle_item_media(query_params)
        elif path == '/commodities': # 상품 경매 API 엔드포인트
            self._handle_commodities_auctions()
        else:
            self._set_headers(404)
            response = {'error': 'Not Found', 'message': 'The requested resource was not found.'}
            self.wfile.write(json.dumps(response).encode())
    
    def _handle_health_check(self):
        """헬스체크 응답"""
        self._set_headers()
        response = {
            'status': 'ok',
            'message': 'Service is healthy and running'
        }
        self.wfile.write(json.dumps(response).encode())
    
    def _handle_metrics(self):
        """성능 지표 응답"""
        self._set_headers()
        # stats 인스턴스에서 현재 지표 가져오기
        metrics = stats.get_stats()
        
        # 아이템 정보 통계 추가
        try:
            if auctions_collection is not None and item_metadata_collection is not None:
                # 전체 아이템 수와 고유 아이템 ID 수 계산
                total_items_count = auctions_collection.count_documents({})
                
                # 고유한 아이템 ID 목록 가져오기
                unique_item_ids_cursor = auctions_collection.aggregate([
                    {"$match": {"item_id": {"$ne": None}}},
                    {"$group": {"_id": "$item_id"}},
                    {"$project": {"item_id": "$_id", "_id": 0}}
                ])
                unique_item_ids = [doc.get('item_id') for doc in unique_item_ids_cursor]
                
                # 메타데이터가 있는 아이템 수 계산
                metadata_count = item_metadata_collection.count_documents({})
                
                # 메타데이터 있는 아이템 ID 목록
                metadata_item_ids = [doc.get('item_id') for doc in 
                                    item_metadata_collection.find({}, {"item_id": 1, "_id": 0})]
                
                # 현재 경매에 등록된 아이템 중 메타데이터가 있는 비율 계산
                items_with_metadata = len([item_id for item_id in unique_item_ids if item_id in metadata_item_ids])
                metadata_coverage = round((items_with_metadata / len(unique_item_ids)) * 100, 2) if unique_item_ids else 0
                
                # 지표에 추가
                metrics['total_auction_items'] = total_items_count
                metrics['unique_item_ids'] = len(unique_item_ids)
                metrics['items_with_metadata'] = items_with_metadata
                metrics['metadata_coverage_percentage'] = metadata_coverage
                metrics['total_metadata_count'] = metadata_count
                metrics['metadata_queue_size'] = len(new_item_ids_queue) if 'new_item_ids_queue' in globals() else 0
                
        except Exception as e:
            logger.error(f"아이템 메타데이터 통계 계산 중 오류: {str(e)}")
            metrics['metadata_stats_error'] = str(e)
        
            if auctions_collection is not None:
                # item_obj.name 또는 item_name이 존재하는 문서 수 계산
                named_items_count = auctions_collection.count_documents({
                    "$or": [
                        {"item_obj.name": {"$exists": True}},
                        {"item_name": {"$exists": True}}
                    ]
                })
                # 전체 아이템 수
                total_items_count = auctions_collection.count_documents({})
                # 이름이 없는 아이템 수
                unnamed_items_count = total_items_count - named_items_count
                
                # 지표에 추가
                metrics['named_items_count'] = named_items_count
                metrics['unnamed_items_count'] = unnamed_items_count
                metrics['total_items_count'] = total_items_count
                metrics['named_items_percentage'] = round((named_items_count / total_items_count) * 100, 2) if total_items_count > 0 else 0
        except Exception as e:
            logger.error(f"이름이 있는 아이템 개수 계산 중 오류: {str(e)}")
            metrics['named_items_count_error'] = str(e)
        
        self.wfile.write(json.dumps(metrics).encode())
    
    def _handle_collect(self, query_params):
        """강제 데이터 수집 처리"""
        global collect_data_func, collect_realm_data_func
        
        # realm_id 파라미터가 있는지 확인
        realm_id = None
        if 'realm_id' in query_params and query_params['realm_id']:
            realm_id = query_params['realm_id'][0]
        
        # 함수 초기화 확인
        if realm_id and collect_realm_data_func is None:
            self._set_headers(503)
            response = {
                'status': 'error',
                'message': 'Realm-specific data collection function is not initialized yet'
            }
            self.wfile.write(json.dumps(response).encode())
            return
        elif not realm_id and collect_data_func is None:
            self._set_headers(503)
            response = {
                'status': 'error',
                'message': 'Data collection function is not initialized yet'
            }
            self.wfile.write(json.dumps(response).encode())
            return
        
        # 데이터 수집 스레드 시작
        if realm_id:
            thread = threading.Thread(target=self._run_realm_collection, args=(realm_id,))
        else:
            thread = threading.Thread(target=self._run_collection)
        thread.daemon = True
        thread.start()
        
        # 즉시 응답
        self._set_headers()
        response = {
            'status': 'started',
            'message': f"{'Realm '+realm_id if realm_id else 'All realms'} data collection has been triggered and is running in the background"
        }
        self.wfile.write(json.dumps(response).encode())
    
    def _handle_item_update(self, query_params):
        """아이템 정보 업데이트 처리"""
        global update_item_info_func
        
        # 함수 초기화 확인
        if update_item_info_func is None:
            self._set_headers(503)
            response = {
                'status': 'error',
                'message': 'Item update function is not initialized yet'
            }
            self.wfile.write(json.dumps(response).encode())
            return
        
        # 아이템 업데이트 스레드 시작
        thread = threading.Thread(target=self._run_item_update)
        thread.daemon = True
        thread.start()
        
        # 즉시 응답
        self._set_headers()
        response = {
            'status': 'started',
            'message': "Item metadata update has been triggered and is running in the background"
        }
        self.wfile.write(json.dumps(response).encode())
    
    def _run_item_update(self):
        """백그라운드 스레드에서 아이템 정보 업데이트 실행"""
        try:
            logger.info("API 엔드포인트를 통해 수동으로 아이템 정보 업데이트 시작")
            update_item_info_func()
            logger.info("수동 아이템 정보 업데이트 완료")
        except Exception as e:
            logger.error(f"수동 아이템 정보 업데이트 중 오류 발생: {str(e)}")
    
    def _handle_db_status(self):
        """MongoDB 상태 확인 엔드포인트"""
        if not mongo_client:
            self._set_headers(503)
            response = {
                'status': 'error',
                'message': 'MongoDB 연결 정보가 올바르지 않거나 연결할 수 없습니다.'
            }
            self.wfile.write(json.dumps(response).encode())
            return

        try:
            # MongoDB 연결 및 상태 확인 (main.py의 db, auctions_collection 사용)
            if db is None or auctions_collection is None: # main.py에서 초기화된 db, auctions_collection 사용
                logger.error("health_server: MongoDB DB 또는 컬렉션 객체가 초기화되지 않았습니다.")
                self._set_headers(503)
                response = {
                    'status': 'error',
                    'message': 'MongoDB DB 또는 컬렉션 객체가 초기화되지 않았습니다.'
                }
                self.wfile.write(json.dumps(response).encode())
                return
            
            # 전체 문서 수
            total_count = auctions_collection.count_documents({}) # auctions_collection 사용
            # 최근 문서
            latest = auctions_collection.find_one(sort=[("collection_time", -1)]) # 정렬 기준 변경 가능성 (예: collection_time)
            
            self._set_headers()
            response = {
                'status': 'ok',
                'total_documents': total_count,
                'latest_document_collection_time': latest['collection_time'] if latest and 'collection_time' in latest else None,
                'database': db.name, # main.py의 db 객체 사용
                'collection': auctions_collection.name, # main.py의 auctions_collection 객체 사용
                'all_collections_in_db': db.list_collection_names()
            }
            self.wfile.write(json.dumps(response, default=str).encode())
        except Exception as e:
            logger.error(f"MongoDB 상태 확인 중 오류 발생: {str(e)}")
            self._set_headers(500)
            response = {
                'status': 'error',
                'message': str(e)
            }
            self.wfile.write(json.dumps(response).encode())
    
    def _run_collection(self):
        """백그라운드 스레드에서 전체 데이터 수집 실행"""
        try:
            logger.info("API 엔드포인트를 통해 수동으로 전체 데이터 수집 시작")
            collect_data_func()
            logger.info("수동 전체 데이터 수집 완료")
        except Exception as e:
            logger.error(f"수동 전체 데이터 수집 중 오류 발생: {str(e)}")
    
    def _run_realm_collection(self, realm_id):
        """백그라운드 스레드에서 특정 realm 데이터 수집 실행"""
        try:
            logger.info(f"API 엔드포인트를 통해 Realm {realm_id}의 데이터 수집 시작")
            collect_realm_data_func(realm_id)
            logger.info(f"Realm {realm_id}의 수동 데이터 수집 완료")
        except Exception as e:
            logger.error(f"Realm {realm_id}의 수동 데이터 수집 중 오류 발생: {str(e)}")
    
    def _handle_auctions(self, query_params):
        """realm_id 또는 commodities_id로 경매 데이터 조회 (캐시 활용)"""
        global db, auctions_collection, item_metadata_collection, g_auction_data_cache, CACHE_TTL_SECONDS, logger
        if auctions_collection is None:
            self._set_headers(503)
            response = {'status': 'error', 'message': 'MongoDB 컬렉션이 초기화되지 않았습니다.'}
            self.wfile.write(json.dumps(response).encode())
            return

        entity_id_str = query_params.get('realm_id', [None])[0] # 파라미터 이름은 realm_id 유지
        item_name = query_params.get('itemName', [None])[0]  # 아이템 이름 파라미터
        item_id = query_params.get('itemId', [None])[0]  # 아이템 ID 파라미터
        
        if not entity_id_str:
            self._set_headers(400)
            response = {'status': 'error', 'message': 'realm_id 파라미터가 필요합니다.'}
            self.wfile.write(json.dumps(response).encode())
            return
        
        entity_id: str | int
        if entity_id_str.startswith("commodities_"):
            entity_id = entity_id_str
            logger.info(f"상품 데이터 요청: {entity_id}")
        else:
            try:
                entity_id = int(entity_id_str)
                logger.info(f"Realm 데이터 요청: {entity_id}")
            except ValueError:
                self._set_headers(400)
                response = {'status': 'error', 'message': 'realm_id는 정수이거나 \'commodities_REGION\' 형식이어야 합니다.'}
                self.wfile.write(json.dumps(response).encode())
                return

        try:
            cached_entity_data = g_auction_data_cache.get(entity_id)
            current_time = datetime.now()
            cache_status_msg = 'no_cache_yet'
            
            if cached_entity_data and \
               (current_time - cached_entity_data['last_updated']).total_seconds() < CACHE_TTL_SECONDS:
                logger.info(f"[{entity_id}] 캐시 사용. 마지막 업데이트: {cached_entity_data['last_updated']}")
                all_items = cached_entity_data['data']
                total_items_count = cached_entity_data['total_count']
                cache_status_msg = 'used'
            else:
                logger.info(f"[{entity_id}] 캐시 없거나 만료됨. DB에서 새로 빌드.")
                cache_result = update_auction_data_cache(entity_id) # 수정된 캐시 함수 호출
                if cache_result:
                    all_items = cache_result['data']
                    total_items_count = cache_result['total_count']
                    cache_status_msg = 'updated'
                else:
                    self._set_headers(500)
                    response = {'status': 'error', 'message': f'ID {entity_id} 데이터 처리 중 오류 발생'}
                    self.wfile.write(json.dumps(response).encode())
                    return
            
            # 아이템 이름과 ID로 필터링
            filtered_items = all_items
            if item_name:
                filtered_items = [item for item in filtered_items 
                                if item.get('item_name', '').lower().find(item_name.lower()) != -1]
            if item_id:
                try:
                    item_id_int = int(item_id)
                    filtered_items = [item for item in filtered_items 
                                    if item.get('item', {}).get('id') == item_id_int]
                except ValueError:
                    logger.warning(f"잘못된 item_id 형식: {item_id}")
                    # 잘못된 item_id는 무시하고 진행
            
            self._set_headers()
            response = {
                'status': 'ok',
                'entity_id': entity_id, # 조회한 ID 명시
                'total_count': len(filtered_items),  # 필터링된 아이템 수로 변경
                'auctions': filtered_items,
                'cache_status': cache_status_msg,
                'filters': {
                    'itemName': item_name,
                    'itemId': item_id
                }
            }
            self.wfile.write(json.dumps(response, default=str).encode())

        except Exception as e:
            logger.error(f"/auctions API 오류 (ID: {entity_id}): {e}", exc_info=True)
            self._set_headers(500)
            response = {'status': 'error', 'message': str(e)}
            self.wfile.write(json.dumps(response).encode())
    
    def _handle_realms(self):
        """현재 auctions 컬렉션에 존재하는 모든 고유 realm_id와 각 count 반환"""
        global auctions_collection
        if auctions_collection is None:
            self._set_headers(503)
            response = {'status': 'error', 'message': 'MongoDB 컬렉션이 초기화되지 않았습니다.'}
            self.wfile.write(json.dumps(response).encode())
            return
        try:
            pipeline = [
                {"$group": {"_id": "$realm_id", "count": {"$sum": 1}}},
                {"$sort": {"_id": 1}}
            ]
            result = list(auctions_collection.aggregate(pipeline))
            realms = [{"realm_id": r["_id"], "count": r["count"]} for r in result if r["_id"] is not None]
            self._set_headers()
            response = {
                'status': 'ok',
                'realms': realms
            }
            self.wfile.write(json.dumps(response, default=str).encode())
        except Exception as e:
            logger.error(f"/realms API 오류: {e}", exc_info=True)
            self._set_headers(500)
            response = {'status': 'error', 'message': str(e)}
            self.wfile.write(json.dumps(response).encode())
    
    def _handle_item_metadata(self, query_params):
        """아이템 메타데이터 조회"""
        global db, item_metadata_collection
        if item_metadata_collection is None:
            self._set_headers(503)
            response = {'status': 'error', 'message': 'MongoDB 아이템 메타데이터 컬렉션이 초기화되지 않았습니다.'}
            self.wfile.write(json.dumps(response).encode())
            return

        # 파라미터 파싱
        item_id_str = query_params.get('item_id', [None])[0]
        if not item_id_str:
            self._set_headers(400)
            response = {'status': 'error', 'message': 'item_id 파라미터가 필요합니다.'}
            self.wfile.write(json.dumps(response).encode())
            return

        try:
            # 문자열을 정수로 변환
            item_id = int(item_id_str)
            # 메타데이터 컬렉션에서 조회
            item = item_metadata_collection.find_one({"item_id": item_id})
            if item:
                # ObjectId를 문자열로 변환
                item['_id'] = str(item['_id'])
                self._set_headers()
                response = {
                    'status': 'ok',
                    'item': item
                }
                self.wfile.write(json.dumps(response, default=str).encode())
            else:
                self._set_headers(404)
                response = {'status': 'error', 'message': f'Item ID {item_id}의 메타데이터를 찾을 수 없습니다.'}
                self.wfile.write(json.dumps(response).encode())
        except ValueError:
            self._set_headers(400)
            response = {'status': 'error', 'message': 'item_id는 정수여야 합니다.'}
            self.wfile.write(json.dumps(response).encode())
        except Exception as e:
            logger.error(f"/item-metadata API 오류: {e}", exc_info=True)
            self._set_headers(500)
            response = {'status': 'error', 'message': str(e)}
            self.wfile.write(json.dumps(response).encode())
    
    def _handle_item_media(self, query_params):
        """아이템 미디어 정보 조회 (Blizzard API 직접 호출)"""
        item_id_str = query_params.get('item_id', [None])[0]

        if not item_id_str:
            self._set_headers(400)
            response = {'status': 'error', 'message': 'item_id 파라미터가 필요합니다.'}
            self.wfile.write(json.dumps(response).encode())
            return

        try:
            item_id = int(item_id_str)
        except ValueError:
            self._set_headers(400)
            response = {'status': 'error', 'message': 'item_id는 정수여야 합니다.'}
            self.wfile.write(json.dumps(response).encode())
            return

        try:
            # API 토큰 가져오기
            # 실제 운영시에는 토큰 관리 정책에 따라 get_access_token() 호출을 최소화하거나
            # 캐싱된 토큰을 사용하는 것이 좋습니다. 여기서는 단순화를 위해 매번 호출합니다.
            token = get_access_token()
            if not token:
                self._set_headers(500)
                response = {'status': 'error', 'message': 'Blizzard API 토큰을 가져올 수 없습니다.'}
                self.wfile.write(json.dumps(response).encode())
                return

            media_data = get_item_media(token, item_id)

            if media_data:
                self._set_headers()
                # 전체 응답을 그대로 전달하거나, 필요한 부분(예: 아이콘 URL)만 추출하여 전달할 수 있습니다.
                # 여기서는 전체 응답을 전달합니다.
                response = {
                    'status': 'ok',
                    'media': media_data
                }
                self.wfile.write(json.dumps(response, default=str).encode())
            else:
                self._set_headers(404)
                response = {'status': 'error', 'message': f'Item ID {item_id}의 미디어 정보를 찾을 수 없습니다.'}
                self.wfile.write(json.dumps(response).encode())
        
        except Exception as e:
            logger.error(f"/item-media API 오류 (item_id: {item_id}): {e}", exc_info=True)
            self._set_headers(500)
            response = {'status': 'error', 'message': str(e)}
            self.wfile.write(json.dumps(response).encode())
    
    def _handle_auctions_by_itemid(self, query_params):
        """특정 item ID에 대한 모든 서버의 경매 정보 조회"""
        global auctions_collection, logger # item_metadata_collection은 여기서는 직접 사용 안 함 (필요시 추가)

        if auctions_collection is None:
            self._set_headers(503)
            response = {'status': 'error', 'message': 'MongoDB 컬렉션이 초기화되지 않았습니다.'}
            self.wfile.write(json.dumps(response).encode())
            return

        realm_id_str = query_params.get('realm_id', [None])[0]
        item_id_str = query_params.get('item_id', [None])[0]

        if not realm_id_str or not item_id_str:
            self._set_headers(400)
            response = {'status': 'error', 'message': 'realm_id와 item_id 파라미터가 모두 필요합니다.'}
            self.wfile.write(json.dumps(response).encode())
            return
        
        try:
            realm_id = int(realm_id_str)
            item_id = int(item_id_str)
        except ValueError:
            self._set_headers(400)
            response = {'status': 'error', 'message': 'realm_id와 item_id는 정수여야 합니다.'}
            self.wfile.write(json.dumps(response).encode())
            return

        try:
            # buyout이 존재하고 0보다 큰 경매만 조회, item_id와 realm_id로 필터링
            query = {
                'realm_id': realm_id,
                'item_id': item_id,
                'buyout': {"$exists": True, "$ne": None, "$gt": 0}
            }
            # 즉시 구매가(buyout) 오름차순으로 정렬
            # 참고: 동일 가격일 경우 추가 정렬 기준(예: quantity)을 둘 수 있음
            cursor = auctions_collection.find(query).sort('buyout', pymongo.ASCENDING)
            
            item_auctions = []
            for doc in cursor:
                # ObjectId를 문자열로 변환 (JSON 직렬화를 위해)
                if '_id' in doc and not isinstance(doc['_id'], (str, int, float)):
                    doc['_id'] = str(doc['_id'])
                # 필요시 다른 필드(예: 아이템 이름, 아이콘 등)를 여기서 추가할 수 있으나,
                # 프론트에서 이미 대표 아이템 정보를 가지고 있으므로 여기서는 순수 경매 데이터 위주로 반환
                item_auctions.append(doc)
            
            self._set_headers()
            response = {
                'status': 'ok',
                'realm_id': realm_id,
                'item_id': item_id,
                'auctions': item_auctions, # 해당 아이템의 모든 경매 목록
                'count': len(item_auctions)   # 해당 아이템의 총 경매 수
            }
            self.wfile.write(json.dumps(response, default=str).encode())

        except Exception as e:
            logger.error(f"/auctions-by-itemid API 오류 (realm: {realm_id}, item: {item_id}): {e}", exc_info=True)
            self._set_headers(500)
            response = {'status': 'error', 'message': str(e)}
            self.wfile.write(json.dumps(response).encode())
    
    def _handle_commodities_auctions(self):
        """Blizzard 상품 경매 API 호출 및 결과 반환"""
        try:
            token = get_access_token()
            if not token:
                self._set_headers(500)
                response = {'error': 'Failed to get access token'}
                self.wfile.write(json.dumps(response).encode())
                return

            commodities_data = get_commodities_auctions(token)
            self._set_headers()
            self.wfile.write(json.dumps(commodities_data).encode())
            
        except Exception as e:
            logger.error(f"Error handling /wow/auctions/commodities: {e}", exc_info=True)
            self._set_headers(500)
            response = {'error': 'Internal Server Error', 'message': str(e)}
            self.wfile.write(json.dumps(response).encode())
    
    def log_message(self, format, *args):
        """로깅 처리 오버라이드"""
        logger.debug(f"HTTP 요청: {self.address_string()} - {format % args}")

class HealthServer:
    """헬스체크 HTTP 서버 클래스"""
    
    def __init__(self, port=DEFAULT_PORT):
        """서버 초기화"""
        self.port = port
        self.server = None
        self.server_thread = None
        self.is_running = False
    
    def start(self):
        """서버 시작"""
        if self.is_running:
            logger.warning("헬스체크 서버가 이미 실행 중입니다.")
            return
        
        try:
            self.server = HTTPServer(('0.0.0.0', self.port), HealthRequestHandler)
            self.server_thread = threading.Thread(target=self._run_server, daemon=True)
            self.server_thread.start()
            self.is_running = True
            logger.info(f"헬스체크 서버가 http://0.0.0.0:{self.port}/health 에서 시작되었습니다.")
            logger.info(f"데이터 수집 엔드포인트: http://0.0.0.0:{self.port}/collect")
            logger.info(f"특정 realm 데이터 수집: http://0.0.0.0:{self.port}/collect?realm_id=<id>")
            logger.info(f"MongoDB 상태 확인: http://0.0.0.0:{self.port}/db-status")
        except Exception as e:
            logger.error(f"헬스체크 서버 시작 중 오류 발생: {str(e)}")
    
    def _run_server(self):
        """서버 실행 (스레드에서 호출)"""
        try:
            self.server.serve_forever()
        except Exception as e:
            logger.error(f"헬스체크 서버 실행 중 오류 발생: {str(e)}")
        finally:
            self.is_running = False
            logger.info(f"Server {self.server_address} is shutting down.")
            self.server.shutdown()
    
    def stop(self):
        """서버 종료"""
        if not self.is_running:
            return
        
        if self.server:
            self.server.shutdown()
            self.is_running = False
            logger.info("헬스체크 서버가 종료되었습니다.")
    
    def set_collect_function(self, func):
        """전체 데이터 수집 함수 설정"""
        global collect_data_func
        collect_data_func = func
        logger.info("전체 데이터 수집 함수가 설정되었습니다.")
    
    def set_realm_collect_function(self, func):
        """특정 realm 데이터 수집 함수 설정"""
        global collect_realm_data_func
        collect_realm_data_func = func
        logger.info("realm별 데이터 수집 함수가 설정되었습니다.")

    def set_db_objects(self, main_db, main_auctions_collection, main_item_metadata_collection=None):
        """main.py에서 초기화된 DB 객체들을 설정"""
        global db, auctions_collection, item_metadata_collection
        db = main_db
        auctions_collection = main_auctions_collection
        item_metadata_collection = main_item_metadata_collection
        logger.info("DB 객체가 health_server에 설정되었습니다.")

    def set_item_update_function(self, func):
        """아이템 정보 업데이트 함수 설정"""
        global update_item_info_func
        update_item_info_func = func
        logger.info("아이템 정보 업데이트 함수가 설정되었습니다.")

# 서버 인스턴스 생성
health_server = HealthServer() 