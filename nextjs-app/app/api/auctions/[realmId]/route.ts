import { NextResponse } from 'next/server';

// 백엔드 서버 주소 (환경 변수로 관리하는 것이 이상적입니다)
const BACKEND_URL = 'http://20.168.3.131:8080'; // 수정: 마지막 / 제거

export async function GET(
  request: Request,
  { params }: { params: { realmId: string } }
) {
  const realmId = params.realmId;

  if (!realmId) {
    return NextResponse.json({ error: 'realmId is required' }, { status: 400 });
  }

  try {
    const response = await fetch(`${BACKEND_URL}/auctions?realm_id=${realmId}`, {
      cache: 'no-store', // 백엔드 캐시 정책을 따르거나 필요에 따라 조정
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error from backend API (/auctions): ${response.status} ${response.statusText}`, errorText);
      return NextResponse.json({ error: `Backend API error: ${response.statusText}`, details: errorText }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching from backend API (/auctions):', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'Internal server error while fetching auctions', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal server error while fetching auctions' }, { status: 500 });
  }
} 