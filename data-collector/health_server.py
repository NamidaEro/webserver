import os
import threading
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
import logging
from monitoring import stats
import urllib.parse
import pymongo
from datetime import datetime

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
        
        if path == '/health':
            self._handle_health_check()
        elif path == '/metrics':
            self._handle_metrics()
        elif path == '/collect':
            self._handle_collect(query_params)
        elif path == '/db-status':
            self._handle_db_status()
        elif path == '/auctions':
            self._handle_auctions(query_params)
        elif path == '/realms':
            self._handle_realms()
        elif path == '/item-update':
            self._handle_item_update(query_params)
        elif path == '/item-metadata':
            self._handle_item_metadata(query_params)
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
        """realm_id, limit, page 파라미터로 경매 데이터 조회"""
        global db, auctions_collection, item_metadata_collection
        if auctions_collection is None:
            self._set_headers(503)
            response = {'status': 'error', 'message': 'MongoDB 컬렉션이 초기화되지 않았습니다.'}
            self.wfile.write(json.dumps(response).encode())
            return

        # 파라미터 파싱
        realm_id = query_params.get('realm_id', [None])[0]
        limit = int(query_params.get('limit', [20])[0])
        page = int(query_params.get('page', [1])[0])
        if not realm_id:
            self._set_headers(400)
            response = {'status': 'error', 'message': 'realm_id 파라미터가 필요합니다.'}
            self.wfile.write(json.dumps(response).encode())
            return

        try:
            query = {'realm_id': int(realm_id)}
            total_count = auctions_collection.count_documents(query)
            skip = (page - 1) * limit
            cursor = auctions_collection.find(query).sort('collection_time', -1).skip(skip).limit(limit)
            
            # 아이템 ID 목록 추출
            item_ids = set()
            auctions_list = []
            for doc in cursor:
                doc['_id'] = str(doc['_id'])  # ObjectId를 문자열로 변환
                if 'item_id' in doc and doc['item_id'] is not None:
                    item_ids.add(doc['item_id'])
                auctions_list.append(doc)
            
            # 메타데이터가 있는 경우 아이템 이름 추가
            if item_metadata_collection is not None and item_ids:
                # 해당 아이템 ID의 메타데이터 조회
                item_metadata = {doc['item_id']: doc for doc in 
                               item_metadata_collection.find({"item_id": {"$in": list(item_ids)}})}
                
                # 경매 데이터에 아이템 이름 추가
                for auction in auctions_list:
                    item_id = auction.get('item_id')
                    if item_id in item_metadata:
                        # 아이템 이름이 있으면 추가
                        auction['item_name'] = item_metadata[item_id].get('name', f'아이템 #{item_id}')
                        # 품질 정보도 추가 가능
                        auction['item_quality'] = item_metadata[item_id].get('quality', '일반')
                        # 기타 필요한 메타데이터 추가
            
            # 아이템 이름이 있는 항목을 우선으로 정렬
            auctions_list.sort(key=lambda x: (0 if 'item_name' in x and x['item_name'] and not x['item_name'].startswith('아이템 #') else 1))
            
            self._set_headers()
            response = {
                'status': 'ok',
                'total_count': total_count,
                'page': page,
                'limit': limit,
                'auctions': auctions_list
            }
            self.wfile.write(json.dumps(response, default=str).encode())
        except Exception as e:
            logger.error(f"/auctions API 오류: {e}", exc_info=True)
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