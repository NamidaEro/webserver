import { NextResponse } from 'next/server';
import { db } from '@/app/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { AuctionData } from '@/app/lib/firestoreService';

export async function GET(request: Request) {
  // URL에서 realmId 추출
  const { searchParams } = new URL(request.url);
  const realmId = searchParams.get('realmId');
  
  if (!realmId) {
    return NextResponse.json({ error: 'Missing realmId parameter' }, { status: 400 });
  }
  try {
    console.log(`Fetching auction data from Firestore for realm: ${realmId}`);
    
    try {
      // Firestore 컬렉션 참조 생성
      const auctionsRef = collection(db, 'auctions');
      
      // 특정 realmId에 해당하는 문서만 쿼리
      const q = query(auctionsRef, where('realmId', '==', realmId));
      const querySnapshot = await getDocs(q);
      
      // 결과 데이터 추출
      const auctions: AuctionData[] = [];
      querySnapshot.forEach((doc) => {
        auctions.push(doc.data() as AuctionData);
      });
      
      console.log(`Found ${auctions.length} auctions in Firestore for realm ${realmId}`);
      
      return NextResponse.json({ 
        auctions: auctions,
        source: 'firestore',
        timestamp: new Date().toISOString()
      });
    } catch (firestoreError) {
      // Firestore 권한 오류 확인
      const isPermissionError = firestoreError instanceof Error && 
        (firestoreError.message.includes('permission') || firestoreError.toString().includes('permission-denied'));
      
      if (isPermissionError) {
        console.warn('Firestore permission error, returning empty result');
        
        // 권한 오류 시 빈 결과 반환 (API 호출은 성공으로 처리)
        return NextResponse.json({ 
          auctions: [],
          source: 'firestore-error',
          authStatus: {
            hasPermission: false,
            error: 'Firebase 권한 오류: 보안 규칙을 확인하세요',
            requiresAuth: true
          },
          timestamp: new Date().toISOString()
        });
      }
      
      // 다른 종류의 오류는 상위로 전달
      throw firestoreError;
    }
  } catch (error) {
    console.error('Firestore fetch error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch auction data from Firestore', 
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
