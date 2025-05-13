import os
import threading
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
import logging
from monitoring import stats

# 로거 설정
logger = logging.getLogger('data-collector.health_server')

# 기본 포트 설정
DEFAULT_PORT = int(os.getenv('HEALTH_PORT', '8080'))

class HealthRequestHandler(BaseHTTPRequestHandler):
    """헬스체크 및 상태 정보 제공을 위한 HTTP 핸들러"""
    
    def _set_headers(self, status_code=200, content_type='application/json'):
        """응답 헤더 설정"""
        self.send_response(status_code)
        self.send_header('Content-type', content_type)
        self.end_headers()
    
    def do_GET(self):
        """GET 요청 처리"""
        if self.path == '/health':
            self._handle_health_check()
        elif self.path == '/metrics':
            self._handle_metrics()
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

# 서버 인스턴스 생성
health_server = HealthServer() 