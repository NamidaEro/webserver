import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

// 백엔드 서버 주소 (환경 변수로 관리하는 것이 이상적입니다)
const BACKEND_URL = 'http://20.168.3.131:8080';

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

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('auctions');

    // itemId가 있는 경우: 해당 아이템의 모든 경매 목록 반환
    if (itemId) {
      const auctions = await collection.find({
        realm_id: realmId,
        item_id: parseInt(itemId)
      }).toArray();
      
      console.log('[API] 아이템 경매 목록 첫 번째 항목:', auctions[0]);
      return NextResponse.json(auctions);
    }

    // itemName이 있는 경우: 해당 이름의 아이템 검색
    if (itemName) {
      const pipeline = [
        {
          $match: {
            realm_id: realmId,
            item_name: itemName
          }
        },
        {
          $group: {
            _id: '$item_id',
            item_id: { $first: '$item_id' },
            item_name: { $first: '$item_name' },
            icon_url: { $first: '$icon_url' },
            item_quality: { $first: '$item_quality' },
            unit_price: { $min: '$unit_price' },
            quantity: { $sum: '$quantity' }
          }
        }
      ];
      const auctions = await collection.aggregate(pipeline).toArray();
      return NextResponse.json(auctions);
    }

    // 기본: 모든 아이템의 최저가 목록 반환
    const pipeline = [
      {
        $match: {
          realm_id: realmId
        }
      },
      {
        $group: {
          _id: '$item_id',
          item_id: { $first: '$item_id' },
          item_name: { $first: '$item_name' },
          icon_url: { $first: '$icon_url' },
          item_quality: { $first: '$item_quality' },
          unit_price: { $min: '$unit_price' },
          quantity: { $sum: '$quantity' }
        }
      },
      {
        $sort: {
          unit_price: 1
        }
      }
    ];

    const auctions = await collection.aggregate(pipeline).toArray();
    return NextResponse.json(auctions);
  } catch (error) {
    console.error('Error fetching auctions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch auctions' },
      { status: 500 }
    );
  }
} 