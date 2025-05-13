import os
import logging
import logging.handlers
from datetime import datetime

# 로그 디렉토리 설정
LOG_DIR = os.getenv('LOG_DIR', 'logs')
os.makedirs(LOG_DIR, exist_ok=True)

# 로그 파일명 형식 설정
log_file = os.path.join(LOG_DIR, f'data-collector-{datetime.now().strftime("%Y-%m-%d")}.log')

def setup_logger():
    """애플리케이션 로거 설정"""
    # 루트 로거 설정
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    
    # 콘솔 핸들러
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_format = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    console_handler.setFormatter(console_format)
    
    # 파일 핸들러 (일별 로그 파일 생성)
    file_handler = logging.handlers.TimedRotatingFileHandler(
        log_file,
        when='midnight',
        interval=1,
        backupCount=30,  # 30일간 로그 보관
        encoding='utf-8'
    )
    file_handler.setLevel(logging.INFO)
    file_format = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    file_handler.setFormatter(file_format)
    
    # 핸들러 등록
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)
    
    return root_logger

# 개별 로거 생성 함수
def get_logger(name):
    """모듈별 로거 생성"""
    return logging.getLogger(name) 