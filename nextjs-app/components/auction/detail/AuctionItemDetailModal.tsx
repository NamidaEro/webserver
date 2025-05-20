import React, { useEffect } from 'react';
import { AuctionItem } from '@/lib/types/auction';
import CurrencyDisplay from '@/components/auction/common/CurrencyDisplay';

interface AuctionItemDetailModalProps {
  item: AuctionItem | null;
  allAuctionsForItem?: AuctionItem[];
  isLoadingDetails?: boolean;
  isOpen: boolean;
  onClose: () => void;
}

// 아이템 등급별 텍스트 색상 (Tailwind CSS 클래스) - AuctionItemRow와 중복되므로 나중에 공통 파일로 분리 가능
const qualityColorClasses: { [key: string]: string } = {
  poor: 'text-gray-400',
  common: 'text-white',
  uncommon: 'text-green-400',
  rare: 'text-blue-400',
  epic: 'text-purple-400',
  legendary: 'text-orange-400',
  artifact: 'text-red-500',
  heirloom: 'text-yellow-400',
};

export default function AuctionItemDetailModal({
  item,
  allAuctionsForItem,
  isLoadingDetails,
  isOpen,
  onClose,
}: AuctionItemDetailModalProps) {
  if (!isOpen || !item) {
    return null;
  }

  const itemName = item.item_name || item.name || `아이템 #${item.item_id || item.itemId}`;
  const itemQuality = (item.item_quality || item.quality || 'common').toLowerCase();
  const qualityClass = qualityColorClasses[itemQuality] || 'text-gray-300';
  
  // 대표 가격 (buyout) 표시. 백엔드에서 이미 최저가 1개만 보내므로 해당 가격 사용
  const representativeBuyout = item.buyoutPrice || item.buyout || 0;
  const iconUrl = item.iconUrl || item.item_obj?.icon;
  const itemLevel = item.level || item.item_level;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // 가격별 그룹핑 로직
  const groupedAuctions = React.useMemo(() => {
    if (!allAuctionsForItem) return {};
    return allAuctionsForItem.reduce((acc, auction) => {
      const price = auction.buyout || 0;
      if (price > 0) {
        if (!acc[price]) {
          acc[price] = { count: 0, price };
        }
        acc[price].count += (auction.quantity || 1); // 수량 고려 (기본 1)
      }
      return acc;
    }, {} as { [price: number]: { count: number; price: number } });
  }, [allAuctionsForItem]);

  const sortedGroupedAuctions = React.useMemo(() => {
    return Object.values(groupedAuctions).sort((a, b) => a.price - b.price);
  }, [groupedAuctions]);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      {/* 와우 경매장 스타일 모달 컨테이너 */}
      <div 
        className="bg-gray-800 border-4 border-gray-900 shadow-2xl rounded-md w-full max-w-2xl relative my-8" // 너비 증가, 상하 마진
        style={{ boxShadow: '0 0 15px rgba(0,0,0,0.5)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 모달 헤더 (아이템 이름) */}
        <div className="bg-gray-900 px-4 py-2 flex justify-between items-center rounded-t-sm">
          <h2 className={`text-lg font-semibold ${qualityClass}`}>{itemName}</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none font-bold"
          >
            &times;
          </button>
        </div>

        {/* 모달 본문 */}
        <div className="p-5 bg-gray-700 bg-opacity-50 max-h-[70vh] overflow-y-auto"> {/* 스크롤 가능하도록 */}
          <div className="flex flex-col md:flex-row">
            {/* 좌측: 아이콘 및 기본 정보 */}
            <div className="mr-0 md:mr-5 mb-5 md:mb-0 flex-shrink-0 w-full md:w-auto flex md:flex-col items-center md:items-start">
              <div className="mr-4 md:mr-0">
                {iconUrl ? (
                  <img 
                    src={iconUrl} 
                    alt={itemName} 
                    className="w-20 h-20 rounded border-2 border-gray-600 object-cover"
                  />              
                ) : (
                  <div className="w-20 h-20 bg-gray-600 rounded border-2 border-gray-500 flex items-center justify-center text-gray-400 text-3xl">?</div>
                )}
              </div>
              <div className="text-left md:text-center">
                {itemLevel && <p className="text-sm text-gray-400 mt-1">레벨: {itemLevel}</p>}
                <p className={`${qualityClass} font-semibold mt-1`}>
                  {itemQuality.charAt(0).toUpperCase() + itemQuality.slice(1)}
                </p>
                <p className="text-gray-300 text-sm mb-1">
                  아이템 ID: {item.itemId || item.item_id}
                </p>
              </div>
            </div>

            {/* 우측: 가격별 경매 목록 또는 대표 가격 */}
            <div className="flex-grow">
              {/* 대표 즉시 구매가 (기존) - allAuctionsForItem이 없을 때 보여줄 수 있음 */}
              {representativeBuyout > 0 && (!allAuctionsForItem || allAuctionsForItem.length === 0) && !isLoadingDetails && (
                <div className="mt-3 pt-3 border-t border-gray-600">
                  <p className="text-gray-400 text-sm">대표 즉시 구매가:</p>
                  <CurrencyDisplay totalCopper={representativeBuyout} className="text-xl"/>
                </div>
              )}

              {/* 가격별 경매 목록 */}
              <h3 className="text-lg font-semibold text-gray-200 mb-2 border-b border-gray-600 pb-1">개별 경매 목록</h3>
              {isLoadingDetails && (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-400">경매 목록을 불러오는 중...</p>
                </div>
              )}
              {!isLoadingDetails && sortedGroupedAuctions.length > 0 && (
                <div className="space-y-2">
                  {sortedGroupedAuctions.map(({ price, count }) => (
                    <div key={price} className="flex justify-between items-center p-2 bg-gray-750 rounded shadow">
                      <CurrencyDisplay totalCopper={price} className="text-md" />
                      <span className="text-sm text-gray-300">{count} 개</span>
                    </div>
                  ))}
                </div>
              )}
              {!isLoadingDetails && sortedGroupedAuctions.length === 0 && allAuctionsForItem && (
                 <p className="text-sm text-gray-400 text-center py-3">이 아이템에 대한 현재 경매가 없습니다.</p>
              )}
               {!isLoadingDetails && !allAuctionsForItem && ( // 로딩도 아니고 데이터도 없을때 (오류 상황 등)
                 <p className="text-sm text-gray-400 text-center py-3">경매 정보를 불러올 수 없습니다.</p>
              )}
            </div>
          </div>
        </div>
        
        {/* 모달 푸터 (필요시 추가 버튼 등) - 현재는 없음 */}
        {/* <div className="bg-gray-900 px-4 py-3 rounded-b-sm text-right">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            닫기
          </button>
        </div> */}
      </div>
    </div>
  );
} 