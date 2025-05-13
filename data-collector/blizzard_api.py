import os
import requests
import logging
import time
from dotenv import load_dotenv
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from monitoring import Timer, timeit, stats

# 환경 변수 로드
load_dotenv()

# 로거 설정
logger = logging.getLogger('data-collector.blizzard_api')

# API 설정
BLIZZARD_CLIENT_ID = os.getenv('BLIZZARD_CLIENT_ID')
BLIZZARD_CLIENT_SECRET = os.getenv('BLIZZARD_CLIENT_SECRET')
BLIZZARD_REGION = os.getenv('BLIZZARD_REGION', 'kr')
BLIZZARD_NAMESPACE = os.getenv('BLIZZARD_NAMESPACE', f'dynamic-{BLIZZARD_REGION}')
BLIZZARD_LOCALE = os.getenv('BLIZZARD_LOCALE', 'ko_KR')

# API 제한 관련 설정
RATE_LIMIT_WAIT = 1  # 초당 API 호출 제한을 위한 대기 시간
MAX_RETRIES = 3      # 최대 재시도 횟수

# 세션 설정 (재시도 로직 포함)
def create_session():
    """재시도 로직이 포함된 세션 생성"""
    session = requests.Session()
    retry_strategy = Retry(
        total=MAX_RETRIES,
        backoff_factor=0.5,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET", "POST"]
    )
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("https://", adapter)
    return session

@timeit
def get_access_token():
    """Blizzard API 접근을 위한 OAuth 토큰 발급"""
    session = create_session()
    
    try:
        stats.increment('api_calls')
        
        url = f'https://{BLIZZARD_REGION}.battle.net/oauth/token'
        response = session.post(
            url,
            data={'grant_type': 'client_credentials'},
            auth=(BLIZZARD_CLIENT_ID, BLIZZARD_CLIENT_SECRET)
        )
        response.raise_for_status()
        return response.json()['access_token']
    
    except Exception as e:
        stats.increment('api_errors')
        logger.error(f"토큰 발급 실패: {str(e)}")
        raise

@timeit
def get_connected_realms(token):
    """연결된 realm 목록 조회"""
    session = create_session()
    
    try:
        stats.increment('api_calls')
        
        url = f'https://{BLIZZARD_REGION}.api.blizzard.com/data/wow/connected-realm/index'
        params = {
            'namespace': BLIZZARD_NAMESPACE,
            'locale': BLIZZARD_LOCALE
        }
        headers = {
            'Authorization': f'Bearer {token}'
        }
        
        response = session.get(url, params=params, headers=headers)
        response.raise_for_status()
        
        # 응답에 connected_realms 키가 없는 경우 처리
        data = response.json()
        if 'connected_realms' not in data:
            logger.warning(f"API 응답에 connected_realms 키가 없습니다: {data}")
            return []
            
        return data['connected_realms']
    
    except Exception as e:
        stats.increment('api_errors')
        logger.error(f"Connected Realms 조회 실패: {str(e)}")
        raise

@timeit
def get_auctions(token, connected_realm_id):
    """특정 realm의 경매장 데이터 조회"""
    session = create_session()
    
    try:
        stats.increment('api_calls')
        
        url = f'https://{BLIZZARD_REGION}.api.blizzard.com/data/wow/connected-realm/{connected_realm_id}/auctions'
        params = {
            'namespace': BLIZZARD_NAMESPACE,
            'locale': BLIZZARD_LOCALE
        }
        headers = {
            'Authorization': f'Bearer {token}'
        }
        
        # API 호출 제한 고려 - 필요 시 대기
        time.sleep(RATE_LIMIT_WAIT)
        
        response = session.get(url, params=params, headers=headers)
        response.raise_for_status()
        
        data = response.json()
        
        # 결과 유효성 검증
        if 'auctions' not in data:
            logger.warning(f"Realm {connected_realm_id}의 응답에 auctions 키가 없습니다.")
            return {'auctions': []}
            
        # 통계 정보 업데이트
        auctions_count = len(data.get('auctions', []))
        stats.increment('items_processed', auctions_count)
        logger.info(f"Realm {connected_realm_id}에서 {auctions_count}개 경매 항목 조회됨")
        
        return data
        
    except requests.exceptions.HTTPError as e:
        stats.increment('api_errors')
        if e.response.status_code == 404:
            logger.warning(f"Realm {connected_realm_id}를 찾을 수 없습니다.")
            return {'auctions': []}
        logger.error(f"Realm {connected_realm_id}의 경매 데이터 조회 실패: {str(e)}")
        raise
    except Exception as e:
        stats.increment('api_errors')
        logger.error(f"Realm {connected_realm_id}의 경매 데이터 조회 중 오류 발생: {str(e)}")
        raise

@timeit
def get_item_info(token, item_id):
    """아이템 정보 조회"""
    session = create_session()
    
    try:
        stats.increment('api_calls')
        
        url = f'https://{BLIZZARD_REGION}.api.blizzard.com/data/wow/item/{item_id}'
        params = {
            'namespace': BLIZZARD_NAMESPACE,
            'locale': BLIZZARD_LOCALE
        }
        headers = {
            'Authorization': f'Bearer {token}'
        }
        
        # API 호출 제한 고려 - 필요 시 대기
        time.sleep(RATE_LIMIT_WAIT)
        
        response = session.get(url, params=params, headers=headers)
        response.raise_for_status()
        return response.json()
        
    except requests.exceptions.HTTPError as e:
        stats.increment('api_errors')
        if e.response.status_code == 404:
            logger.warning(f"아이템 ID {item_id}를 찾을 수 없습니다.")
            return None
        logger.error(f"아이템 정보 조회 실패: {str(e)}")
        raise
    except Exception as e:
        stats.increment('api_errors')
        logger.error(f"아이템 정보 조회 중 오류 발생: {str(e)}")
        raise 