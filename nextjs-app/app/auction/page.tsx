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
  const [realmList, setRealmList] = useState<{realm_id: number, count: number}[]>([]);
  const [selectedRealm, setSelectedRealm] = useState<number | null>(205);
  const limit = 10;

  // realm 목록 불러오기
  useEffect(() => {
    console.log('[AuctionPage] realm 목록을 불러오는 중...');
    fetch('/api/realms')
      .then(res => {
        console.log('[AuctionPage] realm API 응답 상태:', res.status);
        return res.json();
      })
      .then(data => {
        console.log('[AuctionPage] 받은 realm 데이터:', data);
        setRealmList(data.realms || []);
        console.log('[AuctionPage] 설정된 realmList:', data.realms || []);
        if (data.realms && data.realms.length > 0) {
          setSelectedRealm(data.realms[0].realm_id);
          console.log('[AuctionPage] 선택된 realm:', data.realms[0].realm_id);
        }
      })
      .catch(err => {
        console.error('[AuctionPage] realm 목록 불러오기 오류:', err);
      });
  }, []);

  // 경매 데이터 불러오기
  useEffect(() => {
    if (!selectedRealm) {
      console.log('[AuctionPage] 선택된 realm이 없음');
      return;
    }
    console.log(`[AuctionPage] 경매 데이터 불러오는 중... realm_id=${selectedRealm}, limit=${limit}, page=${currentPage}`);
    setIsLoading(true);
    setError(null);
    fetch(`/api/auctions?realm_id=${selectedRealm}&limit=${limit}&page=${currentPage}`)
      .then(res => {
        console.log('[AuctionPage] 경매 API 응답 상태:', res.status);
        return res.json();
      })
      .then(data => {
        console.log('[AuctionPage] 받은 경매 데이터:', data);
        console.log('[AuctionPage] 경매 아이템 수:', (data.auctions || []).length);
        console.log('[AuctionPage] 총 아이템 수:', data.total_count || 0);
        setAuctionItems(data.auctions || []);
        setTotalItems(data.total_count || 0);
        setTotalPages(Math.ceil((data.total_count || 0) / limit));
      })
      .catch(err => {
        console.error('[AuctionPage] 경매 데이터 불러오기 오류:', err);
        setError('데이터를 불러오는 데 실패했습니다.');
      })
      .finally(() => setIsLoading(false));
  }, [selectedRealm, currentPage]);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };
  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  console.log('[AuctionPage] 렌더링 시점 상태:', {
    auctionItems: auctionItems.length,
    isLoading,
    error,
    currentPage,
    totalPages,
    totalItems,
    selectedRealm
  });

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-gray-800">경매장</h1>
      
      <div className="mb-6 p-4 bg-white shadow rounded-lg">
        <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-4 md:space-y-0">
          <ItemSearchBar />
          <RealmFilterDropdown />
          <div>
            <label>서버(Realm): </label>
            <select
              value={selectedRealm ?? ''}
              onChange={e => {
                const newRealmId = Number(e.target.value);
                console.log('[AuctionPage] 새로운 realm 선택됨:', newRealmId);
                setSelectedRealm(newRealmId);
                setCurrentPage(1);
              }}
            >
              {realmList.map(r => (
                <option key={r.realm_id} value={r.realm_id}>
                  {r.realm_id} (경매 {r.count}개)
                </option>
              ))}
            </select>
          </div>
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