"use client"; // 클라이언트 컴포넌트로 명시

import React, { useEffect, useState } from 'react';
// import useSWR from 'swr'; // SWR import 제거
import ItemSearchBar from '@/components/auction/search/ItemSearchBar';
import RealmFilterDropdown from '@/components/auction/filter/RealmFilterDropdown';
import AuctionTable from '@/components/auction/list/AuctionTable';
import { AuctionItem } from '@/lib/types/auction';
import AuctionItemDetailModal from '@/components/auction/detail/AuctionItemDetailModal';

// fetcher 함수는 범용적으로 사용할 수 있으므로 유지하거나, 필요 없으면 삭제 가능
// 여기서는 fetch를 직접 사용하는 방식으로 복원하므로 일단 주석 처리 또는 삭제
/*
const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(errorData.message || 'API 요청 중 오류가 발생했습니다.');
  }
  return res.json();
};
*/

export default function AuctionPage() {
  const [allAuctionItems, setAllAuctionItems] = useState<AuctionItem[]>([]); // 전체 아이템 목록 저장
  const [displayedAuctionItems, setDisplayedAuctionItems] = useState<AuctionItem[]>([]); // 현재 페이지에 표시될 아이템
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [realmList, setRealmList] = useState<{realm_id: number, count: number}[]>([]);
  const [selectedRealm, setSelectedRealm] = useState<number | null>(null); 
  const itemsPerPage = 10; // 페이지당 아이템 수 (클라이언트에서 관리)

  // 모달 상태 (기존 유지)
  const [selectedAuctionItemForModal, setSelectedAuctionItemForModal] = useState<AuctionItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Realm 목록 가져오기 (원래 방식 복원)
  useEffect(() => {
    console.log('[AuctionPage] realm 목록을 불러오는 중...');
    setIsLoading(true); // 로딩 시작 (선택적)
    fetch('/api/realms')
      .then(res => {
        if (!res.ok) throw new Error('서버 목록 응답 실패');
        return res.json();
      })
      .then(data => {
        console.log('[AuctionPage] 받은 realm 데이터:', data);
        const realms = data.realms || [];
        setRealmList(realms);
        if (realms.length > 0 && selectedRealm === null) {
          setSelectedRealm(realms[0].realm_id);
          console.log('[AuctionPage] 초기 선택된 realm:', realms[0].realm_id);
        }
      })
      .catch(err => {
        console.error('[AuctionPage] realm 목록 불러오기 오류:', err);
        setError('서버 목록을 불러오는 데 실패했습니다.');
      })
      .finally(() => {
        // 경매 데이터 로딩과 겹치지 않도록 isLoading 관리는 경매 데이터 쪽에서 주로 담당
        // setIsLoading(false); 
      });
  }, []); // 초기 1회 및 selectedRealm 변경 시 (이제는 초기 1회만)

  // 전체 경매 데이터 불러오기 (selectedRealm 변경 시)
  useEffect(() => {
    if (!selectedRealm) {
      setAllAuctionItems([]); // 선택된 서버 없으면 전체 아이템 목록 초기화
      setDisplayedAuctionItems([]);
      setTotalItems(0);
      setTotalPages(1);
      setCurrentPage(1);
      setIsLoading(realmList.length === 0); // 서버 목록도 아직 없으면 로딩 중
      return;
    }

    console.log(`[AuctionPage] 전체 경매 데이터 불러오는 중... realm_id=${selectedRealm}`);
    setIsLoading(true);
    setError(null);
    // API 호출 시 page, limit 파라미터 제거
    fetch(`/api/auctions?realm_id=${selectedRealm}`)
      .then(res => {
        if (!res.ok) {
            return res.json().then(errData => { 
                throw new Error(errData.message || '경매 데이터를 불러오는 데 실패했습니다.'); 
            });
        }
        return res.json();
      })
      .then(data => {
        console.log('[AuctionPage] 받은 전체 경매 데이터:', data);
        setAllAuctionItems(data.auctions || []);
        setTotalItems(data.total_count || 0); // 서버가 제공하는 total_count 사용
        // totalPages는 allAuctionItems.length 기반으로 클라이언트에서 계산할 수도 있음
        // 여기서는 서버가 제공하는 total_count를 신뢰
        console.log('[AuctionPage] API 응답의 cache_status:', data.cache_status); 
      })
      .catch(err => {
        console.error('[AuctionPage] 전체 경매 데이터 불러오기 오류:', err);
        setError(err.message);
        setAllAuctionItems([]);
        setDisplayedAuctionItems([]);
        setTotalItems(0);
        setTotalPages(1);
      })
      .finally(() => setIsLoading(false));
  }, [selectedRealm, realmList]); // selectedRealm이 변경되거나, realmList가 처음 로드될 때 실행

  // 클라이언트 사이드 페이지네이션 로직
  useEffect(() => {
    if (totalItems > 0) {
      const newTotalPages = Math.ceil(totalItems / itemsPerPage);
      setTotalPages(newTotalPages);

      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      setDisplayedAuctionItems(allAuctionItems.slice(startIndex, endIndex));
      
      // 현재 페이지가 전체 페이지 수를 넘어갈 경우 (예: 데이터가 줄어든 경우) 현재 페이지 조정
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
      }
    } else {
      setDisplayedAuctionItems([]);
      setTotalPages(1);
    }
  }, [allAuctionItems, currentPage, itemsPerPage, totalItems]);

  const handleItemSelect = (item: AuctionItem) => {
    console.log("[AuctionPage] 아이템 선택됨:", item);
    setSelectedAuctionItemForModal(item);
    setIsDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedAuctionItemForModal(null);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };
  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  console.log('[AuctionPage] 렌더링 시점 상태:', {
    displayedItemsCount: displayedAuctionItems.length,
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
            <label htmlFor="realmSelect" className="mr-2 text-sm font-medium text-gray-700">서버:</label>
            <select
              id="realmSelect"
              value={selectedRealm ?? ''}
              onChange={e => {
                const newRealmId = Number(e.target.value);
                console.log('[AuctionPage] 새로운 realm 선택됨:', newRealmId);
                setSelectedRealm(newRealmId);
                setCurrentPage(1); // 서버 변경 시 1페이지로 초기화
              }}
              className="p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              disabled={realmList.length === 0 && !error} 
            >
              {realmList.length === 0 && !error && <option value="">서버 로딩 중...</option>}
              {error && realmList.length === 0 && <option value="">서버 로드 실패</option>}
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
        {isLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-500">데이터를 불러오는 중입니다...</p>
          </div>
        )}
        {error && !isLoading && <p className="text-center text-red-500 py-8">오류: {error}</p>}
        {!isLoading && !error && (
          <>
            <AuctionTable items={displayedAuctionItems} onItemSelect={handleItemSelect} />
            {totalItems > 0 && displayedAuctionItems.length > 0 && (
              <div className="mt-6 flex justify-between items-center">
                <button 
                  onClick={handlePrevPage} 
                  disabled={currentPage <= 1}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded disabled:opacity-50 hover:bg-gray-400 transition-colors"
                >
                  이전
                </button>
                <span className="text-sm text-gray-700">
                  페이지 {currentPage} / {totalPages} (총 {totalItems}개 아이템)
                </span>
                <button 
                  onClick={handleNextPage} 
                  disabled={currentPage >= totalPages}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded disabled:opacity-50 hover:bg-gray-400 transition-colors"
                >
                  다음
                </button>
              </div>
            )}
          </>
        )}
        {!isLoading && !error && totalItems === 0 && (
            <p className="text-center text-gray-500 py-8">표시할 경매 아이템이 없습니다.</p>
        )}
      </div>

      {/* 모달 렌더링 */}
      <AuctionItemDetailModal 
        item={selectedAuctionItemForModal}
        isOpen={isDetailModalOpen}
        onClose={closeDetailModal}
      />
    </div>
  );
} 