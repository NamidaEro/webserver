import os
import logging
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime, timedelta
import json
from monitoring import Timer, timeit, stats

# 로거 설정
logger = logging.getLogger('data-collector.firebase_db')

@timeit
def init_firestore():
    """Firebase Firestore 초기화"""
    try:
        # Firebase 인증 정보
        service_account_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
        service_account_file = 'wowauction-6229a-firebase-adminsdk-fbsvc-6ded3fa1d5.json'
        
        # 이미 초기화되었는지 확인
        if not firebase_admin._apps:
            # service account 파일 사용 (환경 변수에 지정된 경로)
            if service_account_path and os.path.exists(service_account_path):
                logger.info(f"환경 변수에서 지정된 서비스 계정 파일 사용: {service_account_path}")
                cred = credentials.Certificate(service_account_path)
                firebase_admin.initialize_app(cred)
            # 로컬 디렉토리의 서비스 계정 파일 사용
            elif os.path.exists(service_account_file):
                logger.info(f"로컬 디렉토리의 서비스 계정 파일 사용: {service_account_file}")
                cred = credentials.Certificate(service_account_file)
                firebase_admin.initialize_app(cred)
            # 환경 변수에서 직접 JSON 읽기 (Docker 환경에서 유용)
            elif os.getenv('FIREBASE_SERVICE_ACCOUNT_JSON'):
                logger.info("환경 변수에서 서비스 계정 JSON 사용")
                service_account_json = os.getenv('FIREBASE_SERVICE_ACCOUNT_JSON')
                # 따옴표로 감싸져 있는 경우 처리 ('와 "를 제거)
                if service_account_json.startswith(("'", '"')) and service_account_json.endswith(("'", '"')):
                    service_account_json = service_account_json[1:-1]
                
                try:
                    service_account_info = json.loads(service_account_json)
                    cred = credentials.Certificate(service_account_info)
                    firebase_admin.initialize_app(cred)
                except json.JSONDecodeError as e:
                    logger.error(f"환경 변수에서 JSON 파싱 오류: {str(e)}")
                    raise
            else:
                raise ValueError("Firebase 인증 정보를 찾을 수 없습니다. GOOGLE_APPLICATION_CREDENTIALS 또는 FIREBASE_SERVICE_ACCOUNT_JSON 환경 변수를 설정하거나 서비스 계정 JSON 파일을 디렉토리에 배치하세요.")
            
            logger.info("Firebase 초기화 완료")
        else:
            logger.debug("Firebase가 이미 초기화되어 있습니다.")
        
        # Firestore 클라이언트 반환
        db = firestore.client()
        
        # DB 연결 테스트
        db.collection('test').document('connection_test').set({
            'timestamp': firestore.SERVER_TIMESTAMP,
            'message': 'Connection test',
        })
        
        return db
    
    except Exception as e:
        stats.increment('db_errors')
        logger.error(f"Firestore 초기화 중 오류 발생: {str(e)}")
        raise

@timeit
def save_auctions_to_firestore(db, realm_id, auctions_data, collection_time):
    """경매 데이터를 Firestore에 저장"""
    try:
        # 기본 정보 추출
        auctions = auctions_data.get('auctions', [])
        
        if not auctions:
            logger.warning(f"Realm {realm_id}의 경매 데이터가 비어있습니다.")
            return
        
        with Timer(f"Realm {realm_id} 데이터 저장"):
            # 배치 처리 설정 (Firestore 제한: 최대 500개 문서)
            batch_size = 400
            batch_count = (len(auctions) + batch_size - 1) // batch_size  # 올림 나눗셈
            
            logger.info(f"Realm {realm_id}: 총 {len(auctions)}개 경매 데이터, {batch_count}개 배치로 처리")
            
            # 저장 시작 시간 기록
            start_time = datetime.now()
            
            for i in range(batch_count):
                # 새 배치 생성
                batch = db.batch()
                
                # 배치에 포함될 데이터 범위
                start_idx = i * batch_size
                end_idx = min((i + 1) * batch_size, len(auctions))
                
                # 현재 배치의 경매 데이터
                batch_auctions = auctions[start_idx:end_idx]
                
                for auction in batch_auctions:
                    # 고유 ID 생성 (realm_id + auction_id)
                    auction_id = auction.get('id', 0)
                    doc_id = f"{realm_id}_{auction_id}"
                    
                    # 아이템 ID 추출
                    item = auction.get('item', {})
                    item_id = item.get('id', 0)
                    
                    # 경매 문서 참조
                    auction_ref = db.collection('auctions').document(doc_id)
                    
                    # 저장할 데이터 구성
                    auction_data = {
                        'realm_id': realm_id,
                        'auction_id': auction_id,
                        'item_id': item_id,
                        'bid': auction.get('bid', 0),
                        'buyout': auction.get('buyout', 0),
                        'quantity': auction.get('quantity', 1),
                        'time_left': auction.get('time_left', ''),
                        'collection_time': collection_time,
                        'timestamp': firestore.SERVER_TIMESTAMP
                    }
                    
                    # 배치에 추가
                    batch.set(auction_ref, auction_data)
                
                # 배치 커밋
                stats.increment('db_operations')
                try:
                    batch.commit()
                    logger.info(f"Realm {realm_id}: 배치 {i+1}/{batch_count} 저장 완료 ({end_idx-start_idx}개 문서)")
                except Exception as e:
                    stats.increment('db_errors')
                    logger.error(f"Realm {realm_id}: 배치 {i+1}/{batch_count} 저장 실패: {str(e)}")
                    raise
            
            # 요약 정보 저장
            save_realm_summary(db, realm_id, len(auctions), collection_time)
            
            # 기록 시간 측정
            elapsed_time = (datetime.now() - start_time).total_seconds()
            logger.info(f"Realm {realm_id}: 총 {len(auctions)}개 경매 데이터 저장 완료 (소요 시간: {elapsed_time:.2f}초)")
            
            # 오래된 데이터 정리
            cleanup_old_auctions(db, realm_id)
        
    except Exception as e:
        stats.increment('db_errors')
        logger.error(f"Realm {realm_id} 경매 데이터 저장 중 오류 발생: {str(e)}")
        raise

@timeit
def save_realm_summary(db, realm_id, total_auctions, collection_time):
    """realm별 요약 정보 저장"""
    try:
        stats.increment('db_operations')
        
        summary_ref = db.collection('realm_summaries').document(str(realm_id))
        
        summary_data = {
            'realm_id': realm_id,
            'total_auctions': total_auctions,
            'last_updated': collection_time,
            'timestamp': firestore.SERVER_TIMESTAMP
        }
        
        summary_ref.set(summary_data)
        logger.info(f"Realm {realm_id} 요약 정보 저장 완료")
        
    except Exception as e:
        stats.increment('db_errors')
        logger.error(f"Realm {realm_id} 요약 정보 저장 중 오류 발생: {str(e)}")
        raise

@timeit
def cleanup_old_auctions(db, realm_id, days_to_keep=7):
    """오래된 경매 데이터 삭제 (기본 7일)"""
    try:
        # 삭제 기준 시간 계산
        cutoff_date = datetime.now() - timedelta(days=days_to_keep)
        
        logger.info(f"Realm {realm_id}: {days_to_keep}일 이상 된 데이터 정리 시작 (기준일: {cutoff_date.isoformat()})")
        
        with Timer(f"Realm {realm_id} 오래된 데이터 정리"):
            # 오래된 데이터 쿼리
            query = (db.collection('auctions')
                     .where('realm_id', '==', realm_id)
                     .where('timestamp', '<', cutoff_date))
            
            # 삭제할 문서 조회
            docs = query.stream()
            
            # 삭제할 문서 수 계산 (미리 리스트로 변환하여 계산)
            docs_list = list(docs)
            total_docs = len(docs_list)
            
            if total_docs == 0:
                logger.info(f"Realm {realm_id}: 삭제할 오래된 문서가 없습니다.")
                return
                
            logger.info(f"Realm {realm_id}: 총 {total_docs}개의 오래된 문서 삭제 예정")
            
            # 배치 삭제
            batch_size = 400
            batch_count = (total_docs + batch_size - 1) // batch_size  # 올림 나눗셈
            
            for i in range(batch_count):
                batch = db.batch()
                
                start_idx = i * batch_size
                end_idx = min((i + 1) * batch_size, total_docs)
                
                for doc in docs_list[start_idx:end_idx]:
                    batch.delete(doc.reference)
                
                # 배치 커밋
                stats.increment('db_operations')
                batch.commit()
                logger.info(f"Realm {realm_id}: 배치 {i+1}/{batch_count} 삭제 완료 ({end_idx-start_idx}개 문서)")
            
            logger.info(f"Realm {realm_id}: 총 {total_docs}개의 {days_to_keep}일 이상 된 문서 삭제 완료")
        
    except Exception as e:
        stats.increment('db_errors')
        logger.error(f"오래된 데이터 정리 중 오류 발생: {str(e)}")
        # 정리 실패해도 전체 프로세스는 계속 진행
        pass

@timeit
def get_realms_with_data(db):
    """데이터가 있는 모든 realm 목록 조회"""
    try:
        stats.increment('db_operations')
        
        # realms_summaries 컬렉션에서 모든 문서 조회
        summaries = db.collection('realm_summaries').stream()
        
        # realm_id 리스트 반환
        realms = [summary.id for summary in summaries]
        logger.info(f"총 {len(realms)}개 realm에 데이터가 존재합니다.")
        return realms
        
    except Exception as e:
        stats.increment('db_errors')
        logger.error(f"Realm 목록 조회 중 오류 발생: {str(e)}")
        return [] 