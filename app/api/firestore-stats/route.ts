import { NextResponse } from 'next/server';
import { db } from '@/app/lib/firebase';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';

export async function GET(request: Request) {  try {
    // Firestore 컬렉션 참조 생성
    const auctionsRef = collection(db, 'auctions');
    
    try {
      // 기본 통계 수집
      const querySnapshot = await getDocs(auctionsRef);
      const totalAuctions = querySnapshot.size;
      
      // 서버별 경매 수 집계
      const realmCounts = new Map<string, number>();
      querySnapshot.forEach((doc) => {
        const data = doc.data() as {realmId?: string, [key: string]: any};
        const realmId = data.realmId;
        
        if (realmId) {
          realmCounts.set(realmId, (realmCounts.get(realmId) || 0) + 1);
        }
      });
      
      // 통계 데이터 구성
      const stats = {
        totalAuctions,
        realmStats: Array.from(realmCounts).map(([realmId, count]) => ({
          realmId,
          auctionCount: count
        })),
        latestUpdate: new Date().toISOString()
      };
      
      return NextResponse.json(stats);
    } catch (firestoreError) {
      // Firestore 권한 오류 확인
      const isPermissionError = firestoreError instanceof Error && 
        (firestoreError.message.includes('permission') || firestoreError.toString().includes('permission-denied'));
      
      if (isPermissionError) {
        console.warn('Firestore permission error, returning mock data');
        
        // 권한 오류 시 로컬 가짜 데이터 반환
        return NextResponse.json({
          totalAuctions: 0,
          realmStats: [],
          latestUpdate: new Date().toISOString(),
          authStatus: {
            hasPermission: false,
            error: 'Firebase 권한 오류: 보안 규칙을 확인하세요',
            requiresAuth: true
          }
        });
      }
      
      // 다른 종류의 오류는 상위로 전달
      throw firestoreError;
    }
    
  } catch (error) {
    console.error('Firestore stats error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch Firestore statistics', 
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
