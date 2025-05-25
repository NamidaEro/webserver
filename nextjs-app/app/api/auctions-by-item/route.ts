import { NextResponse } from 'next/server';
import { MongoClient, Db } from 'mongodb';

// MongoDB URI (환경 변수에서 가져옴)
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'wowauction'; // 사용하는 데이터베이스 이름으로 변경 필요

let client: MongoClient | null = null;
let db: Db | null = null;

async function connectToDatabase() {
  console.log('[API] connectToDatabase 함수 호출됨');
  console.log(`[API] MONGODB_URI: ${MONGODB_URI ? '설정됨' : '설정되지 않음'}`);

  // if (db && client && client.topology && client.topology.isConnected()) {
  //   return db;
  // }
  // MongoDB 드라이버 v4.x 이상에서는 client.topology를 직접 사용하는 것을 권장하지 않음
  // 연결 풀링은 드라이버가 관리하므로, db 객체가 존재하면 연결된 것으로 간주할 수 있음
  if (db && client) { // client 객체도 확인하여 초기화되었는지 검사
    return db;
  }
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI 환경 변수가 설정되지 않았습니다.');
  }
  client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db(DB_NAME);
  console.log('[API] MongoDB에 성공적으로 연결되었습니다.');
  return db;
}

export async function GET(request: Request) {
  console.log('[API] /api/auctions-by-item GET 요청 수신됨');
  try {
    const { searchParams } = new URL(request.url);
    const realmId = searchParams.get('realmId');
    let itemName = searchParams.get('itemName'); // let으로 변경하여 trim 등 수정 가능하게

    if (!realmId || !itemName) {
      return NextResponse.json({ 
        status: 'error', 
        message: 'realmId와 itemName은 필수 파라미터입니다.' 
      }, { status: 400 });
    }

    // 수신된 itemName 값 로깅 (디코딩된 값)
    console.log(`[API] 수신된 itemName 파라미터 (raw): '${itemName}'`);
    
    // itemName 앞뒤 공백 제거
    itemName = itemName.trim();
    console.log(`[API] 수신된 itemName 파라미터 (trimmed): '${itemName}'`);

    const database = await connectToDatabase();
    const itemMetadataCollection = database.collection('item_metadata');
    const auctionsCollection = database.collection('auctions');

    // 1. item_metadata 컬렉션에서 itemName으로 item_id 목록 조회
    // MongoDB $regex를 사용하여 부분 일치 및 대소문자 무시 검색 (필요에 따라 조정)
    // const itemsWithName = await itemMetadataCollection.find({ name: itemName }).toArray();
    // 보다 정확한 매칭을 위해, 일단은 정확한 이름으로 찾되, 로그를 통해 확인
    const itemsWithNameQuery = { name: itemName };
    console.log('[API] item_metadata 컬렉션 쿼리:', JSON.stringify(itemsWithNameQuery));
    const itemsWithName = await itemMetadataCollection.find(itemsWithNameQuery).toArray();
    
    console.log(`[API] item_metadata 컬렉션 조회 결과 건수: ${itemsWithName.length}`);

    if (!itemsWithName || itemsWithName.length === 0) {
      return NextResponse.json({
        status: 'ok',
        message: '해당 이름을 가진 아이템이 item_metadata에 없습니다.',
        auctions: []
      }, { status: 200 });
    }

    const itemIds = itemsWithName.map(item => item._id); // _id가 item_id임
    console.log(`[API] itemName '${itemName}'에 해당하는 item_id 목록:`, itemIds);

    // 2. 조회된 item_id 목록과 realmId를 사용하여 auctions 컬렉션에서 경매 데이터 조회
    // MongoDB의 item 필드는 객체이고, 그 안에 id 필드가 있는 구조로 보임 (auctions 스크린샷 기반)
    // 따라서 'item.id'로 쿼리해야 함
    const query = { 
      'item.id': { $in: itemIds },
      realm_id: realmId // auctions 컬렉션의 realm_id 필드명 및 값 형식 확인 필요
    };
    
    console.log('[API] auctions 컬렉션 쿼리:', JSON.stringify(query));
    const auctions = await auctionsCollection.find(query).toArray();
    
    console.log(`[API] itemName '${itemName}' (IDs: ${itemIds.join(', ')}) 및 realmId '${realmId}'에 대한 경매 ${auctions.length}건 조회됨`);

    return NextResponse.json({
      status: 'ok',
      auctions: auctions,
      count: auctions.length,
      query_details: {
        realmId,
        itemName,
        foundItemIds: itemIds
      }
    });

  } catch (error) {
    console.error('[API] 아이템 상세 정보 조회 중 오류:', error);
    // 에러 객체의 타입에 따라 메시지 처리
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 서버 오류가 발생했습니다.';
    return NextResponse.json({ 
      status: 'error', 
      message: errorMessage
    }, { status: 500 });
  }
  // finally {
  //   // 요청마다 연결을 닫으면 성능에 영향이 있을 수 있으므로, Next.js 환경에서는 일반적으로 연결을 유지합니다.
  //   // 필요하다면 여기서 client.close()를 호출할 수 있습니다.
  //   // if (client) {
  //   //   await client.close();
  //   //   console.log('[API] MongoDB 연결이 닫혔습니다.');
  //   // }
  // }
} 