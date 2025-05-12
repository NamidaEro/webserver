from blizzard_api import get_access_token, get_connected_realms, get_auctions

if __name__ == "__main__":
    print("Blizzard API 토큰 발급 중...")
    token = get_access_token()
    print(f"Access Token: {token[:10]}...\n")

    print("Connected Realms 목록 조회 중...")
    realms = get_connected_realms(token)
    print(f"총 {len(realms)}개 realm 발견. 첫 번째 realm로 테스트 진행.")

    # 첫 번째 connected realm id 추출
    first_realm_url = realms[0]['href']
    connected_realm_id = first_realm_url.split('/')[-1].split('?')[0]
    print(f"테스트용 Connected Realm ID: {connected_realm_id}\n")

    print("Auctions API 호출 중...")
    auctions_data = get_auctions(token, connected_realm_id)
    print(f"경매 데이터 일부: {str(auctions_data)[:1000]} ...") 