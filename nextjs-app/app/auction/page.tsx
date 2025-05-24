"use client"; // 클라이언트 컴포넌트로 명시

import React, { useEffect, useState } from 'react';
// import useSWR from 'swr'; // SWR import 제거
// import AuctionList from '@/components/auction/list/AuctionList'; // 임시 주석 처리
// import ItemSearchBar from '@/components/auction/search/ItemSearchBar'; // 삭제
// import RealmSelector from '@/components/auction/filter/RealmSelector'; // 임시 주석 처리
// import RealmFilterDropdown from '@/components/auction/filter/RealmFilterDropdown'; // RealmFilterDropdown 임포트 제거
import AuctionTable from '@/components/auction/list/AuctionTable';
import { AuctionItem } from '@/lib/types/auction';
import AuctionItemDetailModal from '@/components/auction/detail/AuctionItemDetailModal';
import AuctionSidebar from '@/components/auction/sidebar/AuctionSidebar'; // 사이드바 컴포넌트 import
import ItemSearchBar from '@/components/auction/search/ItemSearchBar'; // ItemSearchBar import 추가

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
  const [realmList, setRealmList] = useState<{ realm_id: number, count: number }[]>([]);
  const [selectedRealm, setSelectedRealm] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null); // 선택된 카테고리 상태 추가
  const [searchTerm, setSearchTerm] = useState(''); // 검색어 상태 추가
  const itemsPerPage = 10; // 페이지당 아이템 수 (클라이언트에서 관리)

  // 서버 ID와 이름 매핑 객체
  const realmNameMap: { [key: number]: string } = {
    205: '아즈샤라',
    210: '듀로탄',
    214: '윈드러너',
    2116: '줄진',
  };

  // 모달 상태 (기존 유지)
  const [selectedAuctionItemForModal, setSelectedAuctionItemForModal] = useState<AuctionItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  // 특정 아이템의 모든 경매 목록 및 로딩 상태 (신규 추가)
  const [detailedAuctionList, setDetailedAuctionList] = useState<AuctionItem[]>([]);
  const [isDetailedLoading, setIsDetailedLoading] = useState(false);

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
    fetch(`/api/auctions/commodities_kr`)
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
        
        // 같은 아이템 그룹화하여 최저가만 표시하는 로직 추가
        const auctions = data.auctions || [];
        
        // 이름별로 아이템을 그룹화
        const groupedByName = new Map();
        
        // 모든 아이템을 이름별로 그룹화
        auctions.forEach((auction: AuctionItem) => {
          const itemName = auction.item_name;
          if (!itemName) {
            // 이름이 없는 아이템은 그룹화하지 않고 그대로 사용
            return;
          }
          
          if (!groupedByName.has(itemName)) {
            groupedByName.set(itemName, []);
          }
          
          const itemsWithSameName = groupedByName.get(itemName);
          itemsWithSameName.push(auction);
        });
        
        // 결과 배열 준비
        const resultAuctions: AuctionItem[] = [];
        
        // 각 이름 그룹에서 최저가 아이템만 선택
        groupedByName.forEach((items, itemName) => {
          if (items.length <= 1) {
            // 한 개만 있으면 그대로 추가
            resultAuctions.push(...items);
          } else {
            // 여러 개 있으면 최저가 찾기
            let minPriceItem = items[0];
            
            for (let i = 1; i < items.length; i++) {
              const currentItem = items[i];
              if (currentItem.unit_price !== null && 
                  (minPriceItem.unit_price === null || 
                   currentItem.unit_price < minPriceItem.unit_price)) {
                minPriceItem = currentItem;
              }
            }
            
            // 최저가 아이템만 추가
            resultAuctions.push(minPriceItem);
          }
        });
        
        // 이름이 없는 아이템들도 추가
        auctions.forEach((auction: AuctionItem) => {
          if (!auction.item_name) {
            resultAuctions.push(auction);
          }
        });
        
        setAllAuctionItems(resultAuctions);
        setTotalItems(resultAuctions.length);
        
        console.log('[AuctionPage] 그룹화 후 아이템 수:', resultAuctions.length);
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
    let itemsToPaginate = allAuctionItems;

    // 검색어 필터링
    if (searchTerm) {
      itemsToPaginate = itemsToPaginate.filter(item =>
        (item.item_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(item.item_id).includes(searchTerm)
      );
    }

    // 카테고리 필터링 (실제 필드명에 따라 수정 필요)
    if (selectedCategory) {
      // 예시: item.category_id === selectedCategory (실제 아이템 객체의 카테고리 필드 사용)
      // itemsToPaginate = itemsToPaginate.filter(item => item.item_class === selectedCategory || item.item_subclass === selectedCategory);
      // 현재는 AuctionItem 타입에 카테고리 필드가 없으므로, 이 부분은 주석 처리하거나 실제 필드에 맞게 수정해야 합니다.
      // 임시로 모든 아이템을 보여주도록 남겨둡니다.
      console.log("카테고리 필터링 건너뛰기: AuctionItem에 카테고리 필드 부재 또는 미구현");
    }

    const newTotalItems = itemsToPaginate.length;
    setTotalItems(newTotalItems);

    if (newTotalItems > 0) {
      const newTotalPages = Math.ceil(newTotalItems / itemsPerPage);
      setTotalPages(newTotalPages);

      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      setDisplayedAuctionItems(itemsToPaginate.slice(startIndex, endIndex));

      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
      }
    } else {
      setDisplayedAuctionItems([]);
      setTotalPages(1);
      // currentPage는 1로 유지하거나, 필요시 조정
    }
  }, [allAuctionItems, currentPage, itemsPerPage, selectedCategory, searchTerm]); // searchTerm, selectedCategory 의존성 배열에 추가

  const handleItemSelect = async (item: AuctionItem) => {
    console.log("[AuctionPage] 아이템 선택됨:", {
      id: item.item_id,
      name: item.item_name,
      price: item.unit_price
    });

    // 선택된 아이템 정보 설정 및 모달 표시
    setSelectedAuctionItemForModal(item);
    setIsDetailModalOpen(true);
    setDetailedAuctionList([]);
    setIsDetailedLoading(true);

    try {
      // 전체 경매 목록에서 같은 이름의 아이템 찾기
      const sameNameItems = allAuctionItems.filter(auction => 
        auction.item_name && // 이름이 있는 아이템만
        item.item_name && // 선택된 아이템도 이름이 있어야 함
        auction.item_name === item.item_name // 이름이 같은 아이템
      );

      console.log(`[AuctionPage] '${item.item_name}' 아이템 검색 결과:`, {
        totalFound: sameNameItems.length,
        searchedName: item.item_name
      });

      if (sameNameItems.length === 0) {
        console.log("[AuctionPage] 같은 이름의 아이템이 없습니다");
        setDetailedAuctionList([]);
      } else {
        // 가격순 정렬 (null 값은 뒤로)
        const sortedItems = [...sameNameItems].sort((a, b) => {
          if (a.unit_price === null && b.unit_price === null) return 0;
          if (a.unit_price === null) return 1;
          if (b.unit_price === null) return -1;
          return a.unit_price - b.unit_price;
        });

        console.log("[AuctionPage] 정렬된 아이템 목록:", {
          count: sortedItems.length,
          priceRange: {
            min: sortedItems[0]?.unit_price,
            max: sortedItems[sortedItems.length - 1]?.unit_price
          }
        });

        setDetailedAuctionList(sortedItems);
      }
    } catch (err) {
      console.error("[AuctionPage] 상세 경매 목록 처리 중 오류:", err);
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다');
      setDetailedAuctionList([]);
    } finally {
      setIsDetailedLoading(false);
    }
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedAuctionItemForModal(null);
    setDetailedAuctionList([]); // 모달 닫을 때 상세 목록 초기화
    // setError(null); // 상세 조회 에러는 모달 닫을 때 초기화할 수 있음
  };

  const handleCategorySelect = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
    setCurrentPage(1); // 카테고리 변경 시 1페이지로 초기화
    // TODO: 실제 카테고리별 필터링 로직 추가 (useEffect에서 allAuctionItems를 필터링)
    console.log("[AuctionPage] 선택된 카테고리:", categoryId);
  };

  const handleSearchTermChange = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1); // 검색어 변경 시 1페이지로 초기화
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

      {/* 상단 필터 영역 (서버 선택 등) */}
      <div className="mb-6 p-4 bg-white shadow rounded-lg">
        <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-4 md:space-y-0">
          <div className="flex items-center">
            <label htmlFor="realmSelect" className="mr-2 text-sm font-medium text-gray-700 whitespace-nowrap">서버:</label>
            <select
              id="realmSelect"
              value={selectedRealm ?? ''}
              onChange={e => {
                const newRealmId = Number(e.target.value);
                console.log('[AuctionPage] 새로운 realm 선택됨:', newRealmId);
                setSelectedRealm(newRealmId);
                setCurrentPage(1); // 서버 변경 시 1페이지로 초기화
              }}
              className="p-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900"
              disabled={realmList.length === 0 && !error}
            >
              {realmList.length === 0 && !error && <option value="">서버 로딩 중...</option>}
              {error && realmList.length === 0 && <option value="">서버 로드 실패</option>}
              {realmList.map(r => (
                <option key={r.realm_id} value={r.realm_id}>
                  {realmNameMap[r.realm_id] || r.realm_id} (경매 {r.count}개)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 영역: 사이드바 + 경매 목록 */}
      <div className="flex flex-col md:flex-row">
        {/* 사이드바 */}
        <AuctionSidebar
          selectedCategory={selectedCategory}
          onSelectCategory={handleCategorySelect}
        />

        {/* 경매 목록 및 페이지네이션 */}
        <div className="flex-grow p-4 bg-white shadow rounded-lg md:ml-0">
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
              <div className="flex-grow">
                {/* ItemSearchBar를 이곳으로 이동 */}
                {totalItems === 0 && searchTerm && !isLoading && (
                  <p className="text-center text-gray-500 py-4 col-span-full">
                    '{searchTerm}'에 대한 검색 결과가 없습니다.
                  </p>
                )}
                <ItemSearchBar searchTerm={searchTerm} onSearchTermChange={handleSearchTermChange} />
              </div>
              {totalItems > 0 && displayedAuctionItems.length > 0 && (
                <>
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
                </>
              )}
            </>
          )}
          {/* {!isLoading && !error && totalItems === 0 && !searchTerm && ( // searchTerm 없을 때만 기존 메시지 표시
            <p className="text-center text-gray-500 py-8">표시할 경매 아이템이 없습니다.</p>
          )} */}
        </div>
      </div>

      {/* 모달 렌더링 */}
      <AuctionItemDetailModal
        item={selectedAuctionItemForModal}
        allAuctionsForItem={detailedAuctionList} // 새로 추가된 prop 전달
        isLoadingDetails={isDetailedLoading} // 로딩 상태 전달
        isOpen={isDetailModalOpen}
        onClose={closeDetailModal}
      />
    </div>
  );
} 