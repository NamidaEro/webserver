import React, { useState, useEffect } from 'react';
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
  uncommon: 'text-green-500',
  rare: 'text-blue-500',
  epic: 'text-purple-500',
  legendary: 'text-orange-500',
  artifact: 'text-red-600',
  heirloom: 'text-yellow-400',
};

export default function AuctionItemDetailModal({
  item,
  isOpen,
  onClose,
}: AuctionItemDetailModalProps) {
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    // 모달이 열릴 때 아이템이 있으면 수량을 기본값(아이템의 quantity 또는 1)으로 설정
    if (item) {
      setQuantity(item.quantity || 1);
    } else {
      // 아이템이 없으면 (모달이 닫히거나 초기 상태) 수량을 1로 리셋
      setQuantity(1);
    }
  }, [item]); // item 객체가 변경될 때마다 실행

  if (!isOpen || !item) {
    return null;
  }

  const itemName = item.item_name || item.name || `아이템 #${item.item_id || item.itemId}`;
  const itemQuality = (item.item_quality || item.quality || 'common').toLowerCase();
  const qualityClass = qualityColorClasses[itemQuality] || 'text-gray-700';
  const buyoutPricePerItem = item.buyoutPrice || item.buyout || 0;
  const totalBuyoutPrice = buyoutPricePerItem * quantity;
  // iconUrl을 우선 사용, 없으면 item_obj에서 찾음
  const iconUrl = item.iconUrl || item.item_obj?.icon;

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (value >= 1 && value <= (item.quantity || 1)) {
      setQuantity(value);
    } else if (e.target.value === '' && (item.quantity || 1) >=1 ){
      setQuantity(1); // 빈 문자열이면 1로 (또는 최소값으로)
    }
  };

  const handleBuy = () => {
    // TODO: 구매 로직 구현
    console.log(`Buying ${quantity} of ${itemName} for`, totalBuyoutPrice);
    onClose(); // 구매 후 모달 닫기 (임시)
  };
  
  // 모달 배경 클릭 시 닫기
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md relative text-white"
        onClick={(e) => e.stopPropagation()} // 모달 컨텐츠 클릭 시 배경 클릭 이벤트 전파 방지
      >
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white text-2xl leading-none"
        >
          &times;
        </button>

        <div className="flex items-center mb-4">
          {iconUrl ? (
            <img src={iconUrl} alt={itemName} className="w-12 h-12 mr-4 rounded border border-gray-600" />
          ) : (
            <div className="w-12 h-12 mr-4 bg-gray-700 rounded border border-gray-600 flex items-center justify-center text-gray-400 text-xl">?</div>
          )}
          <div>
            <h2 className={`text-xl font-bold ${qualityClass}`}>{itemName}</h2>
            {/* 필요시 아이템 레벨 등 추가 정보 표시 */}
            {/* <p className="text-sm text-gray-400">아이템 레벨: {item.level || item.item_level || '-'}</p> */}
          </div>
        </div>

        <div className="mb-4">
          <label htmlFor="quantity" className="block text-sm font-medium text-gray-300 mb-1">수량:</label>
          <input 
            type="number"
            id="quantity"
            name="quantity"
            min="1"
            max={item.quantity || 1} // API에서 받은 quantity를 최대값으로 설정
            value={quantity}
            onChange={handleQuantityChange}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="mb-6 space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-400">개당 가격:</span>
            <CurrencyDisplay totalCopper={buyoutPricePerItem} />
          </div>
          <div className="flex justify-between text-lg font-semibold">
            <span className="text-gray-300">총 가격:</span>
            <CurrencyDisplay totalCopper={totalBuyoutPrice} />
          </div>
        </div>

        <button 
          onClick={handleBuy}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded transition-colors duration-150"
        >
          구매
        </button>
      </div>
    </div>
  );
} 