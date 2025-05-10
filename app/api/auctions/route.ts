import { NextResponse } from 'next/server';
import OAuthClient from '../../oauth/client';

const REGION = process.env.REGION || '';
const API_BASE_URL = `https://${REGION}.api.blizzard.com/data/wow`;
const LOCALE = process.env.LOCALE || 'ko_KR';

const oauthClient = new OAuthClient({
  client: {
    id: process.env.CLIENT_ID || '',
    secret: process.env.CLIENT_SECRET || '',
  },
  auth: {
    tokenHost: process.env.OAUTH_TOKEN_HOST || 'https://kr.battle.net',
  },
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const CONNECTED_REALM_ID = searchParams.get('realmId');

  if (!CONNECTED_REALM_ID) {
    return NextResponse.json({ error: 'realmId parameter is required' }, { status: 400 });
  }

  try {
    const accessToken = await oauthClient.getToken();
    const url = `${API_BASE_URL}/connected-realm/${CONNECTED_REALM_ID}/auctions?namespace=dynamic-${REGION}&locale=${LOCALE}`;
    // console.log('Constructed URL:', url);
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      namespace: `dynamic-${REGION}`,
    };

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch auctions: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
