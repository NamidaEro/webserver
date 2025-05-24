import os
import logging
from dotenv import load_dotenv
from pymongo import MongoClient
from item_class_collector import ItemClassCollector

# 환경 변수 로드
load_dotenv()

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('data-collector.collect_item_classes')

def main():
    try:
        # MongoDB 연결
        mongo_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/')
        client = MongoClient(mongo_uri)
        
        # 아이템 클래스 수집기 초기화
        collector = ItemClassCollector(client)
        
        # 아이템 클래스 정보 수집
        logger.info("아이템 클래스 정보 수집 시작")
        if collector.collect_item_classes():
            logger.info("아이템 클래스 정보 수집 완료")
        else:
            logger.error("아이템 클래스 정보 수집 실패")
            return
        
        # 아이템 메타데이터 업데이트
        logger.info("아이템 메타데이터 클래스 정보 업데이트 시작")
        if collector.update_item_metadata_with_class():
            logger.info("아이템 메타데이터 클래스 정보 업데이트 완료")
        else:
            logger.error("아이템 메타데이터 클래스 정보 업데이트 실패")
            return
            
    except Exception as e:
        logger.error(f"실행 중 오류 발생: {str(e)}")
    finally:
        client.close()

if __name__ == '__main__':
    main() 