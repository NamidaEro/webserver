import { NextResponse } from 'next/server';
import OAuthClient from '../../oauth/client';

const REGION = process.env.REGION || 'kr';
const API_BASE_URL = `https://${REGION}.api.blizzard.com/data/wow`;
const LOCALE = process.env.LOCALE?.replace('-', '_') || 'ko_KR';

const oauthClient = new OAuthClient({
  client: {
    id: process.env.CLIENT_ID || '',
    secret: process.env.CLIENT_SECRET || '',
  },
  auth: {
    tokenHost: process.env.OAUTH_TOKEN_HOST || 'https://kr.battle.net',
  },
});

export async function GET() {
  try {
    console.log('Starting connected-realms API call');
    console.log('Environment variables:', {
      REGION,
      LOCALE,
      API_BASE_URL,
      CLIENT_ID: process.env.CLIENT_ID?.substring(0, 5) + '...',
      CLIENT_SECRET: process.env.CLIENT_SECRET ? '***' : 'undefined',
      OAUTH_TOKEN_HOST: process.env.OAUTH_TOKEN_HOST
    });
    
    const accessToken = await oauthClient.getToken();
    console.log('Got access token:', accessToken ? '(valid token)' : '(no token)');
    
    const url = `${API_BASE_URL}/connected-realm/index?namespace=dynamic-${REGION}&locale=${LOCALE}`;
    console.log('API URL:', url);
    
    const headers = {
      Authorization: `Bearer ${accessToken}`,
    };    console.log('Sending API request with headers:', {
      Authorization: headers.Authorization ? 'Bearer (token-exists)' : 'No auth header'
    });
    
    const response = await fetch(url, { headers });
    console.log('API response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorDetails = await response.text();
      console.error('API error response body:', errorDetails);
      throw new Error(`Failed to fetch connected realms: ${response.statusText}, Details: ${errorDetails}`);
    }

    const data = await response.json();
    const connectedRealmIds = data.connected_realms.map((realm: { href: string }) => {
      const match = realm.href.match(/connected-realm\/(\d+)/);
      return match ? match[1] : null;
    }).filter((id: string | null) => id !== null);

    return NextResponse.json({ connectedRealmIds });  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error fetching connected realms:', errorMessage);
    console.error('Full error object:', error);
    
    // 상세한 오류 정보 반환
    return NextResponse.json({ 
      error: errorMessage,
      details: error instanceof Error ? {
        name: error.name,
        stack: error.stack
      } : 'Unknown error type'
    }, { status: 500 });
  }
}