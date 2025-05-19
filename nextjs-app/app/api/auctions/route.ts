import { NextResponse } from 'next/server';
// import clientPromise from '@/lib/mongodb'; // 경로 별칭 사용 주석 처리
import clientPromise from '@/lib/mongodb'; // 상대 경로로 변경
import { AuctionItem } from '@/lib/types/auction'; // AuctionItem 타입을 사용

export async function GET(request: Request) {
  console.log('[API] GET /api/auctions 호출됨');
  
  const { searchParams } = new URL(request.url);
  const realm_id = searchParams.get('realm_id');
  const limit = searchParams.get('limit') || '10';
  const page = searchParams.get('page') || '1';
  
  console.log('[API] 요청 파라미터:', { realm_id, limit, page });

  if (!realm_id) {
    console.log('[API] realm_id 파라미터가 없음');
    return NextResponse.json({ status: 'error', message: 'realm_id 파라미터가 필요합니다.' }, { status: 400 });
  }

  try {
    const url = `http://20.168.3.131:8080/auctions?realm_id=${realm_id}&limit=${limit}&page=${page}`;
    console.log('[API] 경매 데이터 요청 중:', url);
    
    const res = await fetch(url);
    console.log('[API] 경매 API 응답 상태:', res.status);
    
    const data = await res.json();
    console.log('[API] 경매 데이터 받음:', {
      auctions_count: data.auctions?.length || 0,
      total_count: data.total_count || 0
    });
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API] 경매 데이터 가져오기 오류:', error);
    return NextResponse.json({
      status: 'error', 
      message: '서버에서 경매 데이터를 가져올 수 없습니다.'
    }, { status: 500 });
  }
} 