"use client"; // 클라이언트 컴포넌트로 명시

import React, { useEffect, useState } from 'react';
import ItemSearchBar from '@/components/auction/search/ItemSearchBar';
import RealmFilterDropdown from '@/components/auction/filter/RealmFilterDropdown';
import AuctionTable from '@/components/auction/list/AuctionTable';
import { AuctionItem } from '@/lib/types/auction';

export default function AuctionPage() {
  const [auctionItems, setAuctionItems] = useState<AuctionItem[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAuctionData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/auctions');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Error: ${response.status}`);
        }
        const data = await response.json();
        setAuctionItems(data.items || []); // API 응답 구조에 따라 items 필드 접근
      } catch (err) {
        console.error("Failed to fetch auction data:", err);
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
      }
      setIsLoading(false);
    };

    fetchAuctionData();
  }, []); // 빈 배열: 컴포넌트 마운트 시 1회 실행

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-gray-800">경매장</h1>
      
      <div className="mb-6 p-4 bg-white shadow rounded-lg">
        <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-4 md:space-y-0">
          <ItemSearchBar />
          <RealmFilterDropdown />
          {/* TODO: 추가 필터 버튼 (가격, 레벨 등) */}
        </div>
      </div>
      
      <div className="p-4 bg-white shadow rounded-lg">
        {isLoading && <p className="text-center text-gray-500 py-8">데이터를 불러오는 중입니다...</p>}
        {error && <p className="text-center text-red-500 py-8">오류: {error}</p>}
        {!isLoading && !error && <AuctionTable items={auctionItems} />}
      </div>
    </div>
  );
} 