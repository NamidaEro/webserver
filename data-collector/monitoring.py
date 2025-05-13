import time
import logging
import functools
from datetime import datetime

logger = logging.getLogger('data-collector.monitoring')

class Timer:
    """작업 수행 시간을 측정하는 컨텍스트 매니저"""
    
    def __init__(self, task_name):
        self.task_name = task_name
        self.start_time = None
    
    def __enter__(self):
        self.start_time = time.time()
        logger.info(f"{self.task_name} 작업 시작")
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        end_time = time.time()
        elapsed_time = end_time - self.start_time
        if exc_type:
            logger.error(f"{self.task_name} 작업 실패: {elapsed_time:.2f}초 소요, 오류: {exc_val}")
        else:
            logger.info(f"{self.task_name} 작업 완료: {elapsed_time:.2f}초 소요")

def timeit(func):
    """함수 실행 시간을 측정하는 데코레이터"""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        logger.debug(f"{func.__name__} 함수 실행 시작")
        try:
            result = func(*args, **kwargs)
            elapsed_time = time.time() - start_time
            logger.debug(f"{func.__name__} 함수 실행 완료: {elapsed_time:.2f}초 소요")
            return result
        except Exception as e:
            elapsed_time = time.time() - start_time
            logger.error(f"{func.__name__} 함수 실행 실패: {elapsed_time:.2f}초 소요, 오류: {str(e)}")
            raise
    return wrapper

class StatsCollector:
    """성능 통계 정보를 수집하는 클래스"""
    
    def __init__(self):
        self.stats = {
            'api_calls': 0,
            'api_errors': 0,
            'db_operations': 0,
            'db_errors': 0,
            'items_processed': 0,
            'start_time': datetime.now().isoformat(),
        }
    
    def increment(self, stat_name, value=1):
        """통계 정보 증가"""
        if stat_name in self.stats:
            self.stats[stat_name] += value
        else:
            self.stats[stat_name] = value
    
    def get_stats(self):
        """현재 통계 정보 조회"""
        self.stats['uptime_seconds'] = (datetime.now() - datetime.fromisoformat(self.stats['start_time'])).total_seconds()
        return self.stats
    
    def log_stats(self):
        """현재 통계 정보 로깅"""
        stats = self.get_stats()
        logger.info(f"성능 통계: {stats}")

# 전역 통계 수집기 인스턴스
stats = StatsCollector() 