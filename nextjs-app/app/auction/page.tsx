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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    const fetchAuctionData = async (pageNumber: number) => {
      setIsLoading(true);
      setError(null);
      try {
        // 페이지 파라미터를 포함하여 API 호출
        const response = await fetch(`/api/auctions?page=${pageNumber}&limit=10`); // limit을 10으로 변경
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Error: ${response.status}`);
        }
        const data = await response.json();
        setAuctionItems(data.items || []);
        setCurrentPage(data.currentPage || 1);
        setTotalPages(data.totalPages || 1);
        setTotalItems(data.totalItems || 0);
      } catch (err) {
        console.error("Failed to fetch auction data:", err);
        setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
        setAuctionItems([]); // 오류 발생 시 아이템 목록 초기화
      }
      setIsLoading(false);
    };

    fetchAuctionData(currentPage);
  }, [currentPage]); // currentPage가 변경될 때마다 데이터를 다시 가져옴

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

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
        {!isLoading && !error && (
          <>
            <AuctionTable items={auctionItems} />
            {totalItems > 0 && (
              <div className="mt-6 flex justify-between items-center">
                <button 
                  onClick={handlePrevPage} 
                  disabled={currentPage <= 1 || isLoading}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded disabled:opacity-50 hover:bg-gray-400 transition-colors"
                >
                  이전
                </button>
                <span className="text-sm text-gray-700">
                  페이지 {currentPage} / {totalPages} (총 {totalItems}개 아이템)
                </span>
                <button 
                  onClick={handleNextPage} 
                  disabled={currentPage >= totalPages || isLoading}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded disabled:opacity-50 hover:bg-gray-400 transition-colors"
                >
                  다음
                </button>
              </div>
            )}
          </>
        )}
        {!isLoading && !error && auctionItems.length === 0 && totalItems === 0 && (
            <p className="text-center text-gray-500 py-8">표시할 경매 아이템이 없습니다.</p>
        )}
      </div>
    </div>
  );
} 