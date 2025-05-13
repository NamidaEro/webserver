import os
import logging
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime, timedelta
import json

# 로거 설정
logger = logging.getLogger('data-collector.firebase_db')

def init_firestore():
    """Firebase Firestore 초기화"""
    try:
        # Firebase 인증 정보
        service_account_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
        
        # 이미 초기화되었는지 확인
        if not firebase_admin._apps:
            # service account 파일 사용
            if service_account_path:
                cred = credentials.Certificate(service_account_path)
                firebase_admin.initialize_app(cred)
            # 환경 변수에서 직접 JSON 읽기 (Docker 환경에서 유용)
            elif os.getenv('FIREBASE_SERVICE_ACCOUNT_JSON'):
                service_account_info = json.loads(os.getenv('FIREBASE_SERVICE_ACCOUNT_JSON'))
                cred = credentials.Certificate(service_account_info)
                firebase_admin.initialize_app(cred)
            else:
                raise ValueError("Firebase 인증 정보를 찾을 수 없습니다.")
        
        # Firestore 클라이언트 반환
        return firestore.client()
    
    except Exception as e:
        logger.error(f"Firestore 초기화 중 오류 발생: {str(e)}")
        raise

def save_auctions_to_firestore(db, realm_id, auctions_data, collection_time):
    """경매 데이터를 Firestore에 저장"""
    try:
        # 기본 정보 추출
        auctions = auctions_data.get('auctions', [])
        
        if not auctions:
            logger.warning(f"Realm {realm_id}의 경매 데이터가 비어있습니다.")
            return
        
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
            batch.commit()
            logger.info(f"Realm {realm_id}: 배치 {i+1}/{batch_count} 저장 완료 ({end_idx-start_idx}개 문서)")
        
        # 요약 정보 저장
        save_realm_summary(db, realm_id, len(auctions), collection_time)
        
        # 기록 시간 측정
        elapsed_time = (datetime.now() - start_time).total_seconds()
        logger.info(f"Realm {realm_id}: 총 {len(auctions)}개 경매 데이터 저장 완료 (소요 시간: {elapsed_time:.2f}초)")
        
        # 오래된 데이터 정리
        cleanup_old_auctions(db, realm_id)
        
    except Exception as e:
        logger.error(f"Realm {realm_id} 경매 데이터 저장 중 오류 발생: {str(e)}")
        raise

def save_realm_summary(db, realm_id, total_auctions, collection_time):
    """realm별 요약 정보 저장"""
    try:
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
        logger.error(f"Realm {realm_id} 요약 정보 저장 중 오류 발생: {str(e)}")
        raise

def cleanup_old_auctions(db, realm_id, days_to_keep=7):
    """오래된 경매 데이터 삭제 (기본 7일)"""
    try:
        # 삭제 기준 시간 계산
        cutoff_date = datetime.now() - timedelta(days=days_to_keep)
        
        # 오래된 데이터 쿼리
        query = (db.collection('auctions')
                 .where('realm_id', '==', realm_id)
                 .where('timestamp', '<', cutoff_date))
        
        # 삭제할 문서 조회
        docs = query.stream()
        
        # 배치 삭제
        batch_size = 400
        batch = db.batch()
        count = 0
        
        for doc in docs:
            batch.delete(doc.reference)
            count += 1
            
            # 배치 크기 도달 시 커밋
            if count >= batch_size:
                batch.commit()
                batch = db.batch()
                logger.info(f"Realm {realm_id}: {count}개의 오래된 문서 삭제 중...")
                count = 0
        
        # 남은 배치 커밋
        if count > 0:
            batch.commit()
        
        logger.info(f"Realm {realm_id}: 총 {count}개의 {days_to_keep}일 이상 된 문서 삭제 완료")
        
    except Exception as e:
        logger.error(f"오래된 데이터 정리 중 오류 발생: {str(e)}")
        # 정리 실패해도 전체 프로세스는 계속 진행
        pass 