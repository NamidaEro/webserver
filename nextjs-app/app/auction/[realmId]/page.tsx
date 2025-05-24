'use client';

import { AuctionResponse, AuctionItem, AuctionsByItemResponse, IndividualAuction } from '@/lib/types/auction';
// Link는 더 이상 직접 사용하지 않으므로 제거하거나, 필요시 유지할 수 있습니다.
// import Link from 'next/link'; 
import React, { useState, useEffect, useMemo } from 'react';
import AuctionItemDetailModal from '@/components/auction/detail/AuctionItemDetailModal'; // 모달 컴포넌트 import

async function getAuctions(realmId: string): Promise<AuctionResponse | null> {
  try {
    // realmId가 없으면 commodities_kr을 사용하도록 변경
    const effectiveRealmId = realmId || 'commodities_kr';
    
    const res = await fetch(`/api/auctions/${effectiveRealmId}`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      console.error(`Error fetching auctions: ${res.status} ${res.statusText}`);
      const errorBody = await res.text();
      console.error(`Error body: ${errorBody}`);
      return null;
    }
    return res.json();
  } catch (error) {
    console.error('Failed to fetch auction data:', error);
    return null;
  }
}

async function getItemAuctionsForModal(realmId: string, itemId: number): Promise<IndividualAuction[] | null> {
  try {
    // realmId가 없으면 commodities_kr을 사용하도록 변경
    const effectiveRealmId = realmId || 'commodities_kr';
    
    const res = await fetch(`/api/auctions-by-item?realmId=${effectiveRealmId}&itemId=${itemId}`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      console.error(`Error fetching item auctions for modal: ${res.status} ${res.statusText}`);
      return null;
    }
    const data: AuctionsByItemResponse = await res.json();
    return data.status === 'ok' ? data.auctions : null;
  } catch (error) {
    console.error('Failed to fetch item auction data for modal:', error);
    return null;
  }
}


interface AuctionPageProps {
  params: {
    realmId: string;
  };
}

export default function AuctionPage({ params }: AuctionPageProps) {
  // realmId가 없으면 commodities_kr을 사용하도록 변경
  const { realmId = 'commodities_kr' } = params;
  const [initialAuctionData, setInitialAuctionData] = useState<AuctionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedItemForModal, setSelectedItemForModal] = useState<AuctionItem | null>(null);
  const [allAuctionsForSelectedItem, setAllAuctionsForSelectedItem] = useState<IndividualAuction[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoadingModalDetails, setIsLoadingModalDetails] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const data = await getAuctions(realmId);
      setInitialAuctionData(data);
      setIsLoading(false);
    }
    fetchData();
  }, [realmId]);

  // 백엔드가 모든 경매 데이터를 보내므로, 프론트에서 그룹핑하여 대표 아이템 선정
  const representativeItemsToDisplay = useMemo(() => {
    if (!initialAuctionData || !initialAuctionData.auctions) return [];
    
    const groupedItems = initialAuctionData.auctions.reduce((acc, current) => {
      if (!current.item || typeof current.item.id !== 'number') {
        return acc;
      }
      const itemId = current.item.id;
      const existingItem = acc[itemId];
      
      // 현재 아이템의 unit_price가 유효한 경우
      if (current.unit_price != null) {
        // 기존 아이템이 없거나, 기존 아이템의 unit_price가 없거나, 현재 아이템 가격이 더 낮은 경우 교체
        if (!existingItem || existingItem.unit_price == null || current.unit_price < existingItem.unit_price) {
          acc[itemId] = current;
        }
      }
      // 현재 아이템의 unit_price가 없고, 기존 아이템도 없는 경우에만 추가 (목록에는 보여야 하므로)
      else if (!existingItem) {
        acc[itemId] = current;
      }
      return acc;
    }, {} as { [key: number]: AuctionItem });
    
    return Object.values(groupedItems).sort((a, b) => {
      const nameA = a.item_name || '';
      const nameB = b.item_name || '';
      const nameCompare = nameA.localeCompare(nameB);
      if (nameCompare !== 0) return nameCompare;
      
      if (a.unit_price != null && b.unit_price == null) return -1;
      if (a.unit_price == null && b.unit_price != null) return 1;
      if (a.unit_price != null && b.unit_price != null) return a.unit_price - b.unit_price;
      return 0;
    });
  }, [initialAuctionData]);

  const handleItemClick = async (item: AuctionItem) => {
    // item.item.id 대신 item.item_id 사용
    if (!item.item_id) {
      console.error("[AuctionPage] 아이템 ID가 없습니다:", item);
      return;
    }
    
    setSelectedItemForModal(item);
    setIsModalOpen(true);
    setIsLoadingModalDetails(true);
    
    const detailedAuctions = await getItemAuctionsForModal(realmId, item.item_id);
    if (detailedAuctions) {
      setAllAuctionsForSelectedItem(detailedAuctions);
    } else {
      setAllAuctionsForSelectedItem([]);
    }
    setIsLoadingModalDetails(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedItemForModal(null);
    setAllAuctionsForSelectedItem([]);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 text-center">
        <p className="text-xl">경매 데이터를 불러오는 중...</p>
        {/* 필요시 스켈레톤 UI 또는 로딩 스피너 추가 */}
      </div>
    );
  }

  if (!initialAuctionData || initialAuctionData.status !== 'ok' || !initialAuctionData.auctions) {
    return (
      <div className="container mx-auto p-4">
        <h1>경매 정보 ({realmId} 서버)</h1>
        <p>경매 데이터를 불러오는데 실패했습니다.</p>
        {initialAuctionData && initialAuctionData.status !== 'ok' && <p>오류: {JSON.stringify(initialAuctionData)}</p>}
      </div>
    );
  }
  
  // 고유 아이템 수를 표시
  const displayTotalCount = representativeItemsToDisplay.length;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">경매장 (서버 ID: {realmId}) - 총 {displayTotalCount}개 고유 아이템</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {representativeItemsToDisplay.map((item) => {
          // item.item.id 가 존재하고 유효한지 다시 한번 확인 (렌더링 단계)
          if (!item.item || typeof item.item.id !== 'number') return null;
          return (
            <div 
              key={`${item.item.id}-${item.id}`} // 고유 아이템 ID (item.item.id)와 경매 ID (item.id) 조합
              onClick={() => handleItemClick(item)}
              className="border rounded-lg p-3 hover:shadow-lg transition-shadow bg-gray-800 text-white block cursor-pointer"
            >
              {item.icon_url && (
                <img 
                  src={item.icon_url} 
                  alt={item.item_name}
                  className="w-16 h-16 mx-auto mb-2 rounded border border-gray-600" 
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              <h2 className="text-sm font-semibold truncate" title={item.item_name}>{item.item_name}</h2>
              <p className={`text-xs item-quality quality-${item.item_quality?.toLowerCase()}`}>{item.item_quality}</p>
              <p className="text-xs text-gray-400">
                최저가: {item.unit_price != null ? (item.unit_price / 10000).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2}) + ' G' : 'N/A'}
              </p>
              <p className="text-xs text-gray-400">수량(최저가 매물): {item.quantity != null ? item.quantity : 'N/A'}</p>
            </div>
          );
        })}
      </div>
      {representativeItemsToDisplay.length === 0 && !isLoading && <p>표시할 아이템이 없습니다.</p>}

      <AuctionItemDetailModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        item={selectedItemForModal}
        allAuctionsForItem={allAuctionsForSelectedItem}
        isLoadingDetails={isLoadingModalDetails}
      />
    </div>
  );
} 