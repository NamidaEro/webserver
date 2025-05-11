import { NextResponse } from 'next/server';
import OAuthClient from '../../oauth/client';

const REGION = process.env.REGION || 'kr';
const LOCALE = 'ko_KR';

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
  const { searchParams } = new URL(req.url);
  const itemClassId = searchParams.get('itemClassId');

  if (!itemClassId) {
    return NextResponse.json({ error: 'Missing itemClassId parameter' }, { status: 400 });
  }

  try {
    // 액세스 토큰 얻기
    const accessToken = await oauthClient.getToken();
      const response = await fetch(
      `https://${REGION}.api.blizzard.com/data/wow/item-class/${itemClassId}/item-subclass/index?namespace=static-${REGION}&locale=${LOCALE}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorDetails = await response.json();
      return NextResponse.json({ error: errorDetails.error || 'Failed to fetch item subclasses' }, { status: response.status });
    }    const data = await response.json();
    
    // 한국어 이름 처리
    if (data && data.item_subclasses && Array.isArray(data.item_subclasses)) {
      data.item_subclasses = data.item_subclasses.map((subclass: any) => {
        if (subclass.name && typeof subclass.name === 'object' && subclass.name.ko_KR) {
          // 이름 객체에서 한국어 값만 사용
          return {
            ...subclass,
            name: subclass.name.ko_KR
          };
        }
        return subclass;
      });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching item subclasses:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
