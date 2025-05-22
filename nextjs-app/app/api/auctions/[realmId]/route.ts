import { NextResponse } from 'next/server';

// 백엔드 서버 주소 (환경 변수로 관리하는 것이 이상적입니다)
const BACKEND_URL = 'http://20.168.3.131:8080';

export async function GET(
  request: Request,
  { params }: { params: { realmId: string } }
) {
  console.log('[API] GET /api/auctions/[realmId] 호출됨'); // 로그 경로 업데이트

  const realmId = params.realmId;
  const { searchParams } = new URL(request.url);
  // const limit = searchParams.get('limit') || '10';
  // const page = searchParams.get('page') || '1';

  console.log('[API] 요청 파라미터:', { realmId }); // realm_id를 realmId로 사용

  // realmId는 경로 매개변수이므로 Next.js가 존재하지 않으면 404를 반환합니다.
  // 따라서 여기서 명시적인 null 체크는 일반적으로 필요하지 않지만,
  // 만약을 위해 또는 다른 경로로 이 코드가 재사용될 경우를 대비해 남겨둘 수 있습니다.
  // 여기서는 Next.js의 기본 동작을 신뢰하고 제거합니다.

  try {
    // 기본 렐름 ID 처리 추가 - 숫자 대신 문자열 ID(commodities_kr)로 설정
    const effectiveRealmId = realmId || 'commodities_kr';
    
    // limit, page 파라미터는 현재 백엔드 요청에는 포함하지 않습니다.
    // 만약 백엔드에서 해당 파라미터를 지원한다면 여기에 추가해야 합니다.
    const backendApiUrl = `${BACKEND_URL}/auctions?realm_id=${effectiveRealmId}`;
    console.log('[API] 경매 데이터 요청 중:', backendApiUrl);

    const response = await fetch(backendApiUrl, {
      cache: 'no-store', // 백엔드 캐시 정책을 따르거나 필요에 따라 조정
    });
    console.log('[API] 백엔드 API 응답 상태:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API] 백엔드 API 오류 (${backendApiUrl}): ${response.status} ${response.statusText}`, errorText);
      return NextResponse.json({ error: `Backend API error: ${response.statusText}`, details: errorText }, { status: response.status });
    }

    const data = await response.json();
    console.log('[API] 경매 데이터 받음:', {
      auctions_count: data.auctions?.length || 0,
      total_count: data.total_count || 0,
      // 전체 데이터를 로그로 남기면 매우 클 수 있으므로, 필요한 주요 정보만 로깅
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('[API] 경매 데이터 가져오기 오류:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Internal server error while fetching auctions', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal server error while fetching auctions' }, { status: 500 });
  }
} 