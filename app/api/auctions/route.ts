import { NextResponse } from 'next/server';

const REGION = process.env.REGION || '';
const API_BASE_URL = `https://${REGION}.api.blizzard.com/data/wow`;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN || '';
const LOCALE = process.env.LOCALE || 'ko_KR';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const CONNECTED_REALM_ID = searchParams.get('connectedRealmId');

  if (!CONNECTED_REALM_ID) {
    return NextResponse.json({ error: 'connectedRealmId parameter is required' }, { status: 400 });
  }

  const url = `${API_BASE_URL}/connected-realm/${CONNECTED_REALM_ID}/auctions?namespace=dynamic-${REGION}&locale=${LOCALE}`;
  const headers = {
    Authorization: `Bearer ${ACCESS_TOKEN}`,
    namespace: `dynamic-${REGION}`,
  };

  try {
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
