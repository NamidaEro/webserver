import { NextResponse } from 'next/server';

// 백엔드 서버 주소
const BACKEND_URL = process.env.BACKEND_URL || 'http://20.168.3.131:8080';

export async function GET(
  request: Request,
  { params }: { params: { realmId: string } }
) {
  console.log('[API] GET /api/auctions/[realmId] 호출됨');

  const realmId = params.realmId;
  const { searchParams } = new URL(request.url);
  const itemName = searchParams.get('itemName');
  const itemId = searchParams.get('itemId');

  console.log('[API] 요청 파라미터:', { realmId, itemName, itemId });
  console.log('[API] 백엔드 서버 주소:', BACKEND_URL);

  try {
    // 백엔드 API 호출
    const backendUrl = `${BACKEND_URL}/auctions/${realmId}${itemId ? `?itemId=${itemId}` : ''}`;
    console.log('[API] 백엔드 요청 URL:', backendUrl);

    const response = await fetch(backendUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch auctions: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API] 경매장 데이터 조회 중 오류:', error);
    return NextResponse.json(
      { 
        error: '경매장 데이터를 가져오는데 실패했습니다',
        details: error instanceof Error ? error.message : '알 수 없는 오류',
        backend_url: BACKEND_URL
      },
      { status: 500 }
    );
  }
} 