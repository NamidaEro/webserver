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

export async function GET(req: Request) {
  const urlParams = new URL(req.url).searchParams;
  const connectedRealmId = urlParams.get('connectedRealmId');

  if (!connectedRealmId) {
    return NextResponse.json({ error: 'Missing connectedRealmId parameter' }, { status: 400 });
  }

  try {
    const accessToken = await oauthClient.getToken();
    const url = `${API_BASE_URL}/connected-realm/${connectedRealmId}?namespace=dynamic-${REGION}&locale=${LOCALE}`;
    const headers = {
      Authorization: `Bearer ${accessToken}`,
    };

    const response = await fetch(url, { headers });
    if (!response.ok) {
      const errorDetails = await response.text();
      throw new Error(`Failed to fetch connected realm: ${response.statusText}, Details: ${errorDetails}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error fetching connected realm:', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}