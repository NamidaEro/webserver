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
            # MongoDB 연결 및 상태 확인
            db = mongo_client.get_database()
            collection = db["auction_data"]
            
            # 전체 문서 수
            total_count = collection.count_documents({})
            # 최근 문서
            latest = collection.find_one(sort=[("timestamp", -1)])
            
            self._set_headers()
            response = {
                'status': 'ok',
                'total_documents': total_count,
                'latest_document': str(latest) if latest else None,
                'database': db.name,
                'collections': db.list_collection_names()
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

# 서버 인스턴스 생성
health_server = HealthServer() 