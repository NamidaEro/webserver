import logging
from pymongo import MongoClient
from blizzard_api import get_access_token, get_item_classes, get_item_class_details
from monitoring import timeit, stats

# 로거 설정
logger = logging.getLogger('data-collector.item_class_collector')

class ItemClassCollector:
    def __init__(self, mongo_client: MongoClient):
        self.db = mongo_client.wowauction
        self.item_metadata = self.db.item_metadata
        self.item_classes = self.db.item_classes

    @timeit
    def collect_item_classes(self):
        """아이템 클래스 정보 수집 및 저장"""
        try:
            # Blizzard API 토큰 획득
            token = get_access_token()
            
            # 아이템 클래스 목록 조회
            item_classes = get_item_classes(token)
            
            # 각 아이템 클래스의 상세 정보 조회 및 저장
            for item_class in item_classes:
                class_id = item_class['id']
                class_details = get_item_class_details(token, class_id)
                
                if class_details:
                    # item_classes 컬렉션에 저장
                    self.item_classes.update_one(
                        {'_id': class_id},
                        {'$set': class_details},
                        upsert=True
                    )
                    
                    logger.info(f"아이템 클래스 {class_id} 정보 저장 완료")
                    stats.increment('item_classes_processed')

            return True

        except Exception as e:
            logger.error(f"아이템 클래스 수집 중 오류 발생: {str(e)}")
            stats.increment('item_class_errors')
            return False

    @timeit
    def update_item_metadata_with_class(self):
        """아이템 메타데이터에 클래스 정보 업데이트"""
        try:
            # 모든 아이템 메타데이터 조회
            items = self.item_metadata.find({})
            
            for item in items:
                if 'blizzard_item_details' in item:
                    item_details = item['blizzard_item_details']
                    
                    # 아이템 클래스 정보 추출
                    if 'item_class' in item_details and 'item_subclass' in item_details:
                        class_info = {
                            'item_class': item_details['item_class'],
                            'item_subclass': item_details['item_subclass']
                        }
                        
                        # 아이템 메타데이터 업데이트
                        self.item_metadata.update_one(
                            {'_id': item['_id']},
                            {'$set': class_info}
                        )
                        
                        logger.info(f"아이템 {item['_id']} 클래스 정보 업데이트 완료")
                        stats.increment('items_updated')

            return True

        except Exception as e:
            logger.error(f"아이템 메타데이터 클래스 정보 업데이트 중 오류 발생: {str(e)}")
            stats.increment('metadata_update_errors')
            return False 