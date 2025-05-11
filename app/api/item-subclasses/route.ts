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

  console.log(`Received request for item subclasses with itemClassId: ${itemClassId}`);

  if (!itemClassId) {
    console.log('Missing itemClassId parameter');
    return NextResponse.json({ error: 'Missing itemClassId parameter' }, { status: 400 });
  }
  try {    // 액세스 토큰 얻기
    const accessToken = await oauthClient.getToken();
      // Blizzard API 문서에 따른 올바른 URL 수정
    // item-class/{id} 형식을 사용 - 서브클래스 정보가 이미 응답에 포함됨
    console.log(`Requesting item class with URL: https://${REGION}.api.blizzard.com/data/wow/item-class/${itemClassId}?namespace=static-${REGION}&locale=${LOCALE}`);
      const response = await fetch(
      `https://${REGION}.api.blizzard.com/data/wow/item-class/${itemClassId}?namespace=static-${REGION}&locale=${LOCALE}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    
    if (!response.ok) {
      console.log(`API error response: ${response.status} ${response.statusText}`);
      // 응답 본문을 한 번만 읽도록 수정
      // 응답 본문을 읽는 것을 시도하지 않고 상태 코드로만 에러 처리
      return NextResponse.json({ 
        error: `Failed to fetch item subclasses: ${response.status} ${response.statusText}`,
        itemClassId: itemClassId
      }, { status: response.status });
    }
      const data = await response.json();
    console.log(`Subclasses data received for itemClassId ${itemClassId}:`, JSON.stringify(data, null, 2));
    
    // 데이터 구조 검증
    if (!data) {
      console.log('API returned empty data');
      return NextResponse.json({ error: 'Empty data received from API', itemClassId }, { status: 500 });
    }
    
    // item_subclasses 필드가 없거나 배열이 아닌 경우 처리
    if (!data.item_subclasses || !Array.isArray(data.item_subclasses)) {
      console.log('API response missing item_subclasses array:', data);
      // 그래도 받은 데이터는 반환
      return NextResponse.json(data);
    }
    
    // 한국어 이름 처리
    data.item_subclasses = data.item_subclasses.map((subclass: any) => {
      if (!subclass) return { id: 0, name: 'Unknown' };
      
      if (subclass.name && typeof subclass.name === 'object' && subclass.name.ko_KR) {
        // 이름 객체에서 한국어 값만 사용
        return {
          ...subclass,
          name: subclass.name.ko_KR
        };
      }
      
      if (typeof subclass.name === 'string') {
        return subclass; // 이미 문자열인 경우 그대로 사용
      }
      
      // 이름이 없거나 예상치 못한 형식인 경우
      return {
        ...subclass,
        name: 'Unknown Name'
      };
    });
    
    console.log(`Processed ${data.item_subclasses.length} subclasses for itemClassId ${itemClassId}`);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Error fetching item subclasses for itemClassId ${itemClassId}:`, error);
    
    // 더 상세한 에러 정보 제공
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    
    console.error('Error details:', { message: errorMessage, stack: errorStack });
    
    return NextResponse.json({ 
      error: `Internal server error: ${errorMessage}`,
      itemClassId: itemClassId 
    }, { status: 500 });
  }
}
