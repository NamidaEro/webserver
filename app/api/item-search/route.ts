import { NextResponse } from 'next/server';
import OAuthClient from '../../oauth/client';

const REGION = process.env.REGION || '';
const API_BASE_URL = `https://${REGION}.api.blizzard.com/data/wow/search/item`;
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
  try {
    console.log('Request URL:', request.url);
    const { searchParams } = new URL(request.url);
    console.log('Search Params:', searchParams.toString());
    const name = searchParams.get('name.ko_KR');
    const page = searchParams.get('_page') || '1';
    console.log('Page:', page);
    console.log('Name:', name);
    if (!name) {
      return NextResponse.json({ error: 'name parameter is required' }, { status: 400 });
    }

    const accessToken = await oauthClient.getToken();
    const encodedName = encodeURIComponent(name);
    const url = `${API_BASE_URL}?namespace=static-${REGION}&name.ko_KR=${encodedName}&orderby=desc&_page=${page}`;
    console.log('Constructed URL:', url);
    const headers = {
      Authorization: `Bearer ${accessToken}`,
    };
    const response = await fetch(url, { headers });
    if (!response.ok) {
      const errorDetails = await response.text();
      console.error('Error details:', errorDetails);
      throw new Error(`Failed to fetch item search: ${response.statusText}, Details: ${errorDetails}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error('Error fetching item search:', errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
