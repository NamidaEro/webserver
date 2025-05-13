import { db } from './firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  getDoc,
  doc,
  startAfter,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot
} from 'firebase/firestore';

/**
 * 경매장 데이터 인터페이스
 */
export interface Auction {
  id: string;
  realm_id: string;
  auction_id: number;
  item_id: number;
  bid: number;
  buyout: number;
  quantity: number;
  time_left: string;
  collection_time: string;
  timestamp: Timestamp;
}

/**
 * Realm 요약 정보 인터페이스
 */
export interface RealmSummary {
  realm_id: string;
  total_auctions: number;
  last_updated: string;
  timestamp: Timestamp;
}

/**
 * 페이지네이션 결과 인터페이스
 */
export interface AuctionPaginationResult {
  auctions: Auction[];
  lastDoc: QueryDocumentSnapshot | null;
  hasMore: boolean;
}

/**
 * 모든 Realm 요약 정보 가져오기
 */
export async function getAllRealmSummaries(): Promise<RealmSummary[]> {
  try {
    const summariesRef = collection(db, 'realm_summaries');
    const q = query(summariesRef, orderBy('total_auctions', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data() as RealmSummary;
      return {
        ...data,
        realm_id: doc.id
      };
    });
  } catch (error) {
    console.error('Realm 요약 정보 조회 오류:', error);
    return [];
  }
}

/**
 * 특정 Realm의 경매 데이터를 페이지네이션으로 가져오기
 */
export async function getAuctionsByRealm(
  realmId: string,
  pageSize: number = 20,
  lastDoc: QueryDocumentSnapshot | null = null,
  sortField: string = 'buyout',
  sortDirection: 'asc' | 'desc' = 'asc',
  filterItemName?: string
): Promise<AuctionPaginationResult> {
  try {
    let auctionsRef = collection(db, 'auctions');
    
    // 쿼리 구성
    let q = query(
      auctionsRef,
      where('realm_id', '==', realmId),
      orderBy(sortField, sortDirection),
      limit(pageSize)
    );
    
    // lastDoc이 있으면 페이지네이션 설정
    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }
    
    // 쿼리 실행
    const querySnapshot = await getDocs(q);
    
    // 결과 변환
    const auctions = querySnapshot.docs.map(doc => {
      const data = doc.data() as Auction;
      return {
        ...data,
        id: doc.id
      };
    });
    
    // 다음 페이지 정보
    const newLastDoc = querySnapshot.docs.length > 0
      ? querySnapshot.docs[querySnapshot.docs.length - 1]
      : null;
    
    const hasMore = querySnapshot.docs.length >= pageSize;
    
    return {
      auctions,
      lastDoc: newLastDoc,
      hasMore
    };
  } catch (error) {
    console.error('경매 데이터 조회 오류:', error);
    return {
      auctions: [],
      lastDoc: null,
      hasMore: false
    };
  }
}

/**
 * 아이템 ID로 최근 경매 데이터 이력 가져오기 (기간별 가격 그래프용)
 */
export async function getItemAuctionHistory(
  realmId: string,
  itemId: number, 
  days: number = 7
): Promise<Auction[]> {
  try {
    // days일 전 날짜 계산
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);
    
    const auctionsRef = collection(db, 'auctions');
    const q = query(
      auctionsRef,
      where('realm_id', '==', realmId),
      where('item_id', '==', itemId),
      where('timestamp', '>=', daysAgo),
      orderBy('timestamp', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data() as Auction;
      return {
        ...data,
        id: doc.id
      };
    });
  } catch (error) {
    console.error('아이템 경매 이력 조회 오류:', error);
    return [];
  }
} 