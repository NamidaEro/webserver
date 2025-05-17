import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { AuctionItem } from '@/lib/types/auction'; // AuctionItem 타입을 사용

export async function GET(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("wowauction"); // 데이터베이스 이름을 .env.local 및 사용자 권한에 맞게 수정

    // URL 쿼리 파라미터에서 검색, 필터, 정렬, 페이지네이션 옵션 가져오기 (추후 구현)
    // const { searchParams } = new URL(request.url);
    // const realm = searchParams.get('realm');
    // const category = searchParams.get('category');
    // const searchQuery = searchParams.get('search');
    // const sortBy = searchParams.get('sortBy');
    // const sortOrder = searchParams.get('sortOrder') === 'desc' ? -1 : 1;
    // const page = parseInt(searchParams.get('page') || '1', 10);
    // const limit = parseInt(searchParams.get('limit') || '50', 10);
    // const skip = (page - 1) * limit;

    // MongoDB 쿼리 객체 생성 (추후 구현)
    // const query: any = {};
    // if (realm) query.realm = realm;
    // if (searchQuery) query.name = { $regex: searchQuery, $options: 'i' };
    // TODO: 카테고리 필터링 로직 추가 (데이터 모델에 따라 다름)

    // 정렬 옵션 (추후 구현)
    // const sortOptions: any = {};
    // if (sortBy) sortOptions[sortBy] = sortOrder;
    // else sortOptions.buyoutPrice = 1; // 기본 정렬: 즉시 구매가 오름차순

    const items = await db
      .collection<AuctionItem>("auctions") // 사용할 컬렉션 이름으로 변경해주세요.
      .find({}) // 초기에는 모든 아이템 조회, 추후 query 객체 사용
      // .sort(sortOptions) // 추후 정렬 옵션 사용
      // .skip(skip) // 추후 페이지네이션 사용
      // .limit(limit) // 추후 페이지네이션 사용
      .toArray();

    // 전체 아이템 수 (페이지네이션에 필요, 추후 구현)
    // const totalItems = await db.collection("auctions").countDocuments(query);
    // const totalPages = Math.ceil(totalItems / limit);

    return NextResponse.json({
      items,
      // currentPage: page, // 추후 추가
      // totalPages,       // 추후 추가
      // totalItems,       // 추후 추가
    });

  } catch (e) {
    console.error('[API/auctions GET] Error:', e);
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: `데이터를 가져오는 데 실패했습니다: ${errorMessage}` }, { status: 500 });
  }
} 