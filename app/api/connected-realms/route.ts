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

export async function GET() {
  try {
    const accessToken = await oauthClient.getToken();
    const url = `${API_BASE_URL}/connected-realm/index?namespace=dynamic-${REGION}&locale=${LOCALE}`;
    // console.log('URL:', url);
    const headers = {
      Authorization: `Bearer ${accessToken}`,
    };

    const response = await fetch(url, { headers });
    if (!response.ok) {
      const errorDetails = await response.text();
      throw new Error(`Failed to fetch connected realms: ${response.statusText}, Details: ${errorDetails}`);
    }

    const data = await response.json();
    const connectedRealmIds = data.connected_realms.map((realm: { href: string }) => {
      const match = realm.href.match(/connected-realm\/(\d+)/);
      return match ? match[1] : null;
    }).filter((id: string | null) => id !== null);

    return NextResponse.json({ connectedRealmIds });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error fetching connected realms:', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}