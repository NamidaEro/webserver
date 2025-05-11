import { NextResponse } from 'next/server';
import OAuthClient from '../../oauth/client';

const REGION = process.env.REGION || 'kr';
const API_BASE_URL = `https://${REGION}.api.blizzard.com/data/wow`;
const LOCALE = 'ko_KR'; // 명시적으로 ko_KR로 설정

const oauthClient = new OAuthClient({
  client: {
    id: process.env.CLIENT_ID || '',
    secret: process.env.CLIENT_SECRET || '',
  },
  auth: {
    tokenHost: process.env.OAUTH_TOKEN_HOST || 'https://kr.battle.net',
  },
});

export async function GET(req: Request) {
  const urlParams = new URL(req.url).searchParams;
  const connectedRealmId = urlParams.get('connectedRealmId');

  if (!connectedRealmId) {
    return NextResponse.json({ error: 'Missing connectedRealmId parameter' }, { status: 400 });
  }

  try {    const accessToken = await oauthClient.getToken();
    const url = `${API_BASE_URL}/connected-realm/${connectedRealmId}?namespace=dynamic-${REGION}&locale=${LOCALE}`;
    console.log('API URL:', url);
    const headers = {
      Authorization: `Bearer ${accessToken}`,
    };

    const response = await fetch(url, { headers });
    if (!response.ok) {
      const errorDetails = await response.text();
      throw new Error(`Failed to fetch connected realm: ${response.statusText}, Details: ${errorDetails}`);
    }    const data = await response.json();
    console.log('API Response Data (Realm Name):', data?.realms?.[0]?.name);
    
    // 이름 데이터 처리
    if (data && data.realms && data.realms.length > 0) {
      // 이름이 직접 문자열이거나 ko_KR 속성이 있는 경우 모두 처리
      if (typeof data.realms[0].name === 'string') {
        // 이미 문자열인 경우 그대로 사용
      } else if (typeof data.realms[0].name === 'object') {
        // 객체인 경우 ko_KR 속성 확인
        if (data.realms[0].name.ko_KR) {
          data.realms[0].name = data.realms[0].name.ko_KR;
        }
      }
    }
    
    return NextResponse.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error fetching connected realm:', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}