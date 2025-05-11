"use client";

import Link from 'next/link';
import ConnectedRealms from './components/ConnectedRealms';
import ItemSearch from './components/ItemSearch';
import Auctions from './components/Auctions';
/* Firebase 상태 표시가 필요할 때 아래 import 주석을 해제하세요
import FirestoreStatus from './components/FirestoreStatus';
*/

export default function ItemSearchPage() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', textAlign: 'center' }}>
      <h1 style={{ marginBottom: '20px' }}>WoW Auction Data</h1>      
      
      {/* Firebase 상태 표시 - 개발 시 필요할 때 주석 해제
      <div style={{ maxWidth: '800px', margin: '0 auto', marginBottom: '20px' }}>
        <FirestoreStatus />
      </div>
      */}
      
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <ConnectedRealms />
        {/* <ItemSearch /> */}
      </div>
      
      <div style={{ 
        marginTop: '30px', 
        backgroundColor: '#222', 
        padding: '15px', 
        borderRadius: '8px',
        maxWidth: '400px',
        margin: '30px auto 0',
        border: '1px solid #444',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)'
      }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#ffffff' }}>Firebase 인증</h3>
        <p style={{ marginBottom: '15px', color: '#cccccc' }}>
          데이터를 수정하려면 Firebase에 인증된 계정으로 로그인해야 합니다.
        </p>
        <Link href="/auth" style={{ 
          display: 'inline-block',
          backgroundColor: '#4285F4',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '4px',
          textDecoration: 'none',
          fontWeight: 'bold'
        }}>
          로그인 페이지로 이동
        </Link>
      </div>
    </div>
  );
}
