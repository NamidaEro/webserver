import os
import requests
from dotenv import load_dotenv

load_dotenv()

BLIZZARD_CLIENT_ID = os.getenv('BLIZZARD_CLIENT_ID')
BLIZZARD_CLIENT_SECRET = os.getenv('BLIZZARD_CLIENT_SECRET')
BLIZZARD_REGION = os.getenv('BLIZZARD_REGION', 'kr')
BLIZZARD_NAMESPACE = os.getenv('BLIZZARD_NAMESPACE', f'dynamic-{BLIZZARD_REGION}')
BLIZZARD_LOCALE = os.getenv('BLIZZARD_LOCALE', 'ko_KR')

def get_access_token():
    url = f'https://{BLIZZARD_REGION}.battle.net/oauth/token'
    response = requests.post(
        url,
        data={'grant_type': 'client_credentials'},
        auth=(BLIZZARD_CLIENT_ID, BLIZZARD_CLIENT_SECRET)
    )
    response.raise_for_status()
    return response.json()['access_token']

def get_connected_realms(token):
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

def get_auctions(token, connected_realm_id):
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