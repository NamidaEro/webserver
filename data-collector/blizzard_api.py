import os
import requests
import logging
from dotenv import load_dotenv

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

def get_access_token():
    """Blizzard API 접근을 위한 OAuth 토큰 발급"""
    try:
        url = f'https://{BLIZZARD_REGION}.battle.net/oauth/token'
        response = requests.post(
            url,
            data={'grant_type': 'client_credentials'},
            auth=(BLIZZARD_CLIENT_ID, BLIZZARD_CLIENT_SECRET)
        )
        response.raise_for_status()
        return response.json()['access_token']
    except Exception as e:
        logger.error(f"토큰 발급 실패: {str(e)}")
        raise

def get_connected_realms(token):
    """연결된 realm 목록 조회"""
    try:
        url = f'https://{BLIZZARD_REGION}.api.blizzard.com/data/wow/connected-realm/index'
        params = {
            'namespace': BLIZZARD_NAMESPACE,
            'locale': BLIZZARD_LOCALE
        }
        headers = {
            'Authorization': f'Bearer {token}'
        }
        response = requests.get(url, params=params, headers=headers)
        response.raise_for_status()
        return response.json()['connected_realms']
    except Exception as e:
        logger.error(f"Connected Realms 조회 실패: {str(e)}")
        raise

def get_auctions(token, connected_realm_id):
    """특정 realm의 경매장 데이터 조회"""
    try:
        url = f'https://{BLIZZARD_REGION}.api.blizzard.com/data/wow/connected-realm/{connected_realm_id}/auctions'
        params = {
            'namespace': BLIZZARD_NAMESPACE,
            'locale': BLIZZARD_LOCALE
        }
        headers = {
            'Authorization': f'Bearer {token}'
        }
        response = requests.get(url, params=params, headers=headers)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.error(f"Realm {connected_realm_id}의 경매 데이터 조회 실패: {str(e)}")
        raise

def get_item_info(token, item_id):
    """아이템 정보 조회"""
    try:
        url = f'https://{BLIZZARD_REGION}.api.blizzard.com/data/wow/item/{item_id}'
        params = {
            'namespace': BLIZZARD_NAMESPACE,
            'locale': BLIZZARD_LOCALE
        }
        headers = {
            'Authorization': f'Bearer {token}'
        }
        response = requests.get(url, params=params, headers=headers)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 404:
            logger.warning(f"아이템 ID {item_id}를 찾을 수 없습니다.")
            return None
        logger.error(f"아이템 정보 조회 실패: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"아이템 정보 조회 중 오류 발생: {str(e)}")
        raise 