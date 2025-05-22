import { NextResponse } from 'next/server';
import { AuctionItem } from '@/lib/types/auction';

// 백엔드 서버 주소
const BACKEND_URL = 'http://20.168.3.131:8080';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const realmId = searchParams.get('realmId');
  const itemId = searchParams.get('itemId');

  if (!itemId) {
    return NextResponse.json({ error: 'itemId is required' }, { status: 400 });
  }
  
  // realmId가 없으면 기본값 'commodities_kr' 사용
  const effectiveRealmId = realmId || 'commodities_kr';

  try {
    // 모든 경매 데이터 가져오기
    const response = await fetch(`${BACKEND_URL}/auctions?realm_id=${effectiveRealmId}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error from backend API (/auctions): ${response.status} ${response.statusText}`, errorText);
      return NextResponse.json({ error: `Backend API error: ${response.statusText}`, details: errorText }, { status: response.status });
    }

    const data = await response.json();
    
    if (!data.auctions || !Array.isArray(data.auctions)) {
      console.error('백엔드에서 유효한 경매 데이터를 반환하지 않음');
      return NextResponse.json({
        status: 'error',
        message: '유효한 경매 데이터를 받지 못했습니다',
        auctions: [],
        count: 0
      }, { status: 500 });
    }

    // 선택한 아이템 찾기
    const targetItem = data.auctions.find((auction: AuctionItem) => 
      (auction.item && auction.item.id === parseInt(itemId)) || 
      auction.item_id === parseInt(itemId)
    );

    if (!targetItem) {
      console.error(`itemId=${itemId}와 일치하는 아이템을 찾을 수 없음`);
      return NextResponse.json({
        status: 'ok',
        realm_id: effectiveRealmId,
        item_id: parseInt(itemId),
        auctions: [],
        count: 0,
        message: '아이템을 찾을 수 없습니다.'
      });
    }

    // 모든 경매 항목 반환 (필터링 없이)
    // 클라이언트에서 필요한 데이터를 필터링하게 함
    const allAuctions = data.auctions;
    
    console.log(`모든 경매 항목 ${allAuctions.length}개를 반환합니다.`);
    console.log(`선택한 아이템: id=${targetItem.item_id}, name=${targetItem.item_name}`);

    return NextResponse.json({
      status: 'ok',
      realm_id: effectiveRealmId,
      item_id: parseInt(itemId),
      item_name: targetItem.item_name,
      selected_item: targetItem,
      auctions: allAuctions,
      total_auctions: allAuctions.length
    });
  } catch (error) {
    console.error('Error fetching from backend API (/auctions):', error);
     if (error instanceof Error) {
        return NextResponse.json({ error: 'Internal server error while fetching item auctions', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal server error while fetching item auctions' }, { status: 500 });
  }
} 