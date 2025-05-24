import { NextResponse } from 'next/server';

// 백엔드 서버 주소
const BACKEND_URL = 'http://20.168.3.131:8080';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const realmId = searchParams.get('realmId');
    const itemId = searchParams.get('itemId');

    if (!realmId || !itemId) {
      return NextResponse.json({ 
        status: 'error', 
        message: 'realmId와 itemId는 필수 파라미터입니다.' 
      }, { status: 400 });
    }

    // 백엔드 API에서 아이템 상세 정보 조회
    const backendApiUrl = `${BACKEND_URL}/auctions-by-item?realm_id=${realmId}&item_id=${itemId}`;
    console.log('[API] 아이템 상세 정보 요청:', backendApiUrl);

    const response = await fetch(backendApiUrl, {
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API] 백엔드 API 오류: ${response.status} ${response.statusText}`, errorText);
      return NextResponse.json({ 
        status: 'error',
        message: '백엔드 API 오류',
        details: errorText
      }, { status: response.status });
    }

    const data = await response.json();
    console.log('[API] 아이템 상세 정보 받음:', {
      auctions_count: data.auctions?.length || 0
    });

    return NextResponse.json({
      status: 'ok',
      ...data
    });

  } catch (error) {
    console.error('[API] 아이템 상세 정보 조회 중 오류:', error);
    return NextResponse.json({ 
      status: 'error', 
      message: '서버 오류가 발생했습니다.' 
    }, { status: 500 });
  }
} 