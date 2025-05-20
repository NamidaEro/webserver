import React, { useEffect } from 'react';
import { AuctionItem } from '@/lib/types/auction';
import CurrencyDisplay from '@/components/auction/common/CurrencyDisplay';

interface AuctionItemDetailModalProps {
  item: AuctionItem | null;
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

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      {/* 와우 경매장 스타일 모달 컨테이너 */}
      <div 
        className="bg-gray-800 border-4 border-gray-900 shadow-2xl rounded-md w-full max-w-lg relative"
        style={{ boxShadow: '0 0 15px rgba(0,0,0,0.5)' }} // 좀 더 입체적인 그림자
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
        <div className="p-5 bg-gray-700 bg-opacity-50">
          <div className="flex">
            {/* 좌측: 아이콘 및 기본 정보 */}
            <div className="mr-5 flex-shrink-0">
              {iconUrl ? (
                <img 
                  src={iconUrl} 
                  alt={itemName} 
                  className="w-20 h-20 rounded border-2 border-gray-600 object-cover"
                />              
              ) : (
                <div className="w-20 h-20 bg-gray-600 rounded border-2 border-gray-500 flex items-center justify-center text-gray-400 text-3xl">?</div>
              )}
              {itemLevel && <p className="text-center text-sm text-gray-400 mt-1">레벨: {itemLevel}</p>}
            </div>

            {/* 우측: 상세 설명 및 가격 (조회용이므로 간단히) */}
            <div className="flex-grow">
              <p className={`${qualityClass} font-semibold`}>
                품질: {itemQuality.charAt(0).toUpperCase() + itemQuality.slice(1)}
              </p>
              <p className="text-gray-300 text-sm mb-3">
                아이템 ID: {item.itemId || item.item_id}
              </p>
              
              {/* 이 부분은 실제 와우 UI와는 다르지만, 대표 가격을 보여주는 예시 */}
              {representativeBuyout > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-600">
                  <p className="text-gray-400 text-sm">대표 즉시 구매가:</p>
                  <CurrencyDisplay totalCopper={representativeBuyout} className="text-xl"/>
                </div>
              )}

              {/* TODO: 필요시 여기에 아이템 설명 (description) 추가 */}
              {/* <p className="text-sm text-gray-400 mt-2">아이템 설명...</p> */}
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