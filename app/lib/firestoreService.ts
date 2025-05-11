'use client';

import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  setDoc, 
  doc, 
  query, 
  where, 
  getDocs,
  serverTimestamp, 
  Timestamp 
} from 'firebase/firestore';

// Auction 인터페이스 정의
export interface AuctionData {
  id: number;
  itemId?: number;  // Optional로 변경
  itemName?: string;
  buyout: number;
  itemClassId?: number | null;
  itemSubclassId?: number | null;
  timestamp?: Timestamp;
  realmId: string;
}

/**
 * 경매 데이터를 Firestore에 저장하는 함수
 * @param auctions 저장할 경매 데이터 배열
 * @param realmId 서버 ID
 * @returns 저장된 문서 ID 배열
 */
export interface AuctionInput {
  id: number;
  item?: { id: number };
  itemName?: string;
  buyout: number;
  itemClassId?: number | null;
  itemSubclassId?: number | null;
  [key: string]: any; // 기타 속성들
}

export const saveAuctionsToFirestore = async (auctions: AuctionInput[], realmId: string): Promise<string[]> => {
  try {
    console.log(`Saving ${auctions.length} auctions to Firestore for realm ${realmId}`);
    const auctionsCollection = collection(db, 'auctions');
    const batch = [];
    const timestamp = serverTimestamp();    // 데이터 변환 및 저장 준비
    
    // 배치가 너무 크면 나누기 (Firestore 제한: 최대 500개)
    const maxBatchSize = 450; // Firestore 한계인 500보다 약간 낮게 설정
    
    for (const auction of auctions) {
      const auctionData: AuctionData = {
        id: auction.id,
        itemId: auction.item?.id, // item?.id가 undefined일 수 있음
        itemName: auction.itemName || 'Unknown',
        buyout: auction.buyout || 0, // buyout이 없으면 0으로 설정
        itemClassId: auction.itemClassId || null,
        itemSubclassId: auction.itemSubclassId || null,
        realmId: realmId,
      };

      // 경매 데이터의 고유 ID 생성 (realmId + auctionId)
      const docId = `${realmId}_${auction.id}`;
      
      // 문서 저장 작업 배치에 추가
      batch.push(
        setDoc(doc(db, 'auctions', docId), {
          ...auctionData,
          timestamp,
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        }, { merge: true })
      );
    }

    try {
      // 모든 저장 작업 실행
      const results = await Promise.all(batch);
      console.log(`Successfully saved ${batch.length} auctions to Firestore`);
      return batch.map((_, i) => `${realmId}_${auctions[i].id}`);
    } catch (firestoreError: any) {
      // Firebase 권한 오류 확인
      const errorMessage = firestoreError instanceof Error ? firestoreError.message : String(firestoreError);
      const isPermissionError = 
        errorMessage.includes('permission') || 
        errorMessage.includes('denied') || 
        errorMessage.includes('PERMISSION_DENIED') ||
        (firestoreError.code && 
         (firestoreError.code === 'permission-denied' || firestoreError.code.includes('permission')));
      
      if (isPermissionError) {
        console.warn('Firebase permission error detected when saving auctions to Firestore');
        console.warn('To fix this issue: Check FIREBASE_SECURITY_RULES.md file for instructions');
        
        // 빈 ID 배열 반환 (에러는 발생시키지 않고 로깅만 함)
        return [];
      }
      
      // 다른 종류의 에러는 다시 throw
      throw firestoreError;
    }
  } catch (error) {
    console.error('Error saving auctions to Firestore:', error);
    throw error;
  }
};

/**
 * 특정 서버의 경매 데이터를 Firestore에서 가져오는 함수
 * @param realmId 서버 ID
 * @returns 경매 데이터 배열
 */
export const getAuctionsFromFirestore = async (realmId: string): Promise<AuctionData[]> => {
  try {
    console.log(`Fetching auctions from Firestore for realm ${realmId}`);
    const auctionsCollection = collection(db, 'auctions');
    const q = query(auctionsCollection, where('realmId', '==', realmId));
    
    try {
      const querySnapshot = await getDocs(q);
      
      const auctions: AuctionData[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as AuctionData;
        auctions.push(data);
      });
      
      console.log(`Retrieved ${auctions.length} auctions from Firestore for realm ${realmId}`);
      return auctions;
    } catch (firestoreError) {
      // Firebase 권한 오류 확인
      const errorMessage = firestoreError instanceof Error ? firestoreError.message : String(firestoreError);
      const isPermissionError = 
        errorMessage.includes('permission') || 
        errorMessage.includes('denied') || 
        (firestoreError instanceof Error && firestoreError.toString().includes('permission-denied'));
      
      if (isPermissionError) {
        console.warn('Firebase permission error detected when fetching auctions from Firestore');
        console.warn('This is likely due to Firestore security rules. Please check your Firebase configuration.');
        
        // 빈 배열 반환 (에러는 발생시키지 않음)
        return [];
      }
      
      // 다른 종류의 에러는 다시 throw
      throw firestoreError;
    }
  } catch (error) {
    console.error('Error fetching auctions from Firestore:', error);
    throw error;
  }
};
