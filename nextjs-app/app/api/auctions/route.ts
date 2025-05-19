import { NextResponse } from 'next/server';
// import clientPromise from '@/lib/mongodb'; // 경로 별칭 사용 주석 처리
import clientPromise from '@/lib/mongodb'; // 상대 경로로 변경
import { AuctionItem } from '@/lib/types/auction'; // AuctionItem 타입을 사용

export async function GET(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("wowauction"); // 데이터베이스 이름을 .env.local 및 사용자 권한에 맞게 수정

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10); // 기본 페이지 당 아이템 수 10으로 변경
    const skip = (page - 1) * limit;

    // TODO: 검색, 필터, 정렬 옵션 (아래 주석 참고)
    // const realm = searchParams.get('realm');
    // const category = searchParams.get('category');
    // const searchQuery = searchParams.get('search');
    // const sortBy = searchParams.get('sortBy');
    // const sortOrder = searchParams.get('sortOrder') === 'desc' ? -1 : 1;

    const query: any = {};
    // if (realm) query.realm_id = realm; // 데이터베이스 필드명에 맞게 수정 (예: realm_id)
    // if (searchQuery) query.name = { $regex: searchQuery, $options: 'i' };
    // TODO: 카테고리 필터링 로직

    const sortOptions: any = {};
    // if (sortBy) sortOptions[sortBy] = sortOrder;
    // else sortOptions.buyout = 1; // 기본 정렬: buyout 오름차순 (실제 필드명으로 수정)

    const itemsFromDB = await db
      .collection("auctions") // 컬렉션 타입 <any> 또는 실제 저장된 타입으로 변경 고려
      .find(query)
      .sort(sortOptions) // 기본 정렬 (필요시 수정)
      .skip(skip)
      .limit(limit)
      .toArray();

    // 프론트엔드 타입에 맞게 데이터 가공
    const items: AuctionItem[] = itemsFromDB.map((item: any) => {
      const itemObj = item.item_obj; // 상세 아이템 정보 객체
      let name = '이름 없음';
      let iconUrl: string | undefined = undefined;
      let level: number | undefined = undefined;
      let quality: string | undefined = undefined;

      if (itemObj) {
        // 이름 (한국어 기준, 실제 API 응답 구조에 따라 수정 필요)
        if (typeof itemObj.name === 'string') {
          name = itemObj.name;
        } else if (typeof itemObj.name === 'object' && itemObj.name?.ko_KR) {
          name = itemObj.name.ko_KR;
        }

        // 아이콘 URL (실제 API 응답 구조에 따라 수정 필요)
        // 예시 1: media 객체 내 assets 배열의 첫 번째 value 사용
        if (itemObj.media?.assets && Array.isArray(itemObj.media.assets) && itemObj.media.assets.length > 0 && itemObj.media.assets[0].key === 'icon') {
            iconUrl = itemObj.media.assets[0].value;
        } 
        // 예시 2: icon 필드가 직접 URL을 가지고 있는 경우 (매우 드물지만, API 스펙에 따라 다를 수 있음)
        else if (itemObj.icon) {
            // iconUrl = itemObj.icon; // 이 경우는 드물지만, API 스펙에 따라 다를 수 있음
            // 혹은, 아이콘 이름을 기반으로 URL을 직접 구성해야 할 수도 있습니다.
            // 예: `https://render.worldofwarcraft.com/classic-us/icons/56/${itemObj.icon}.jpg` (리전 및 게임 버전 확인 필요)
        }
        // 만약 아이콘 정보가 ID 형태로만 제공되고, 별도의 API를 통해 URL을 얻어야 한다면 추가 호출 필요

        // 레벨
        if (typeof itemObj.level === 'number') {
          level = itemObj.level;
        }

        // 등급 (소문자로 변환)
        if (itemObj.quality?.type?.name && typeof itemObj.quality.type.name === 'string') {
          quality = itemObj.quality.type.name.toLowerCase();
        } else if (itemObj.quality?.name && typeof itemObj.quality.name === 'string') { // 일부 API는 quality.name에 바로 등급 문자열이 올 수 있음
            quality = itemObj.quality.name.toLowerCase();
        }
      }

      return {
        id: item._id.toString(), 
        itemId: item.item_id,
        name: name,
        iconUrl: iconUrl,
        level: level,
        quality: quality,
        quantity: item.quantity,
        buyoutPrice: item.buyout,
        timeLeft: item.time_left,
      };
    });

    const totalItems = await db.collection("auctions").countDocuments(query);
    const totalPages = Math.ceil(totalItems / limit);

    return NextResponse.json({
      items,
      currentPage: page,
      totalPages,
      totalItems,
    });

  } catch (e) {
    console.error('[API/auctions GET] Error:', e);
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: `데이터를 가져오는 데 실패했습니다: ${errorMessage}` }, { status: 500 });
  }
} 