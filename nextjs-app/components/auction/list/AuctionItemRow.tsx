import React from 'react';
// import Image from 'next/image'; // Next.js Image 컴포넌트는 제거
import { AuctionItem } from '@/lib/types/auction';
import CurrencyDisplay from '@/components/auction/common/CurrencyDisplay';

interface AuctionItemRowProps {
  item: AuctionItem;
  onItemSelect: (item: AuctionItem) => void; // 아이템 선택 시 호출될 함수
}

// 아이템 등급별 텍스트 색상 (Tailwind CSS 클래스)
const qualityColorClasses: { [key: string]: string } = {
  poor: 'text-gray-400',
  common: 'text-white', // 기본 흰색 또는 상황에 맞게
  uncommon: 'text-green-500',
  rare: 'text-blue-500',
  epic: 'text-purple-500',
  legendary: 'text-orange-500',
  artifact: 'text-red-600', // 예시
  heirloom: 'text-yellow-400', // 예시
};

export default function AuctionItemRow({ item, onItemSelect }: AuctionItemRowProps) {
  // API 데이터 구조와 일치하도록 매핑
  const itemId = item.item_id; // item.itemId 대신 item.item_id 사용
  const buyoutPrice = item.buyout; // item.buyoutPrice 대신 item.buyout 사용 (AuctionItem 타입 기준)
  
  // 아이템 이름 추출 - 우선순위: item_name -> 아이템 ID 사용
  // AuctionItem 타입에 name, item_obj가 없으므로 관련 로직 간소화
  let itemName = item.item_name || `아이템 #${item.item_id}`;
  
  // 아이템 품질(등급) 확인 - 우선순위: item_quality
  // AuctionItem 타입에 quality, item_obj가 없으므로 관련 로직 간소화
  let quality = item.item_quality;
  
  // quality가 없는 경우 기본값
  const qualityClass = quality ? 
    qualityColorClasses[quality.toLowerCase()] || 'text-gray-700' : 
    'text-gray-700';
  
  // iconUrl 사용 (백엔드에서 제공)
  // const iconDisplayUrl = item.iconUrl; // iconUrl -> icon_url
  const iconDisplayUrl = item.icon_url;

  console.log('[AuctionItemRow] 렌더링 아이템:', { 
    itemId, 
    buyoutPrice, 
    name: itemName,
    api_item_name: item.item_name, // API에서 제공한 이름 로그
    // item_obj: item.item_obj // AuctionItem 타입에 없음
  });

  return (
    <tr 
      className="border-b border-gray-200 hover:bg-gray-100 cursor-pointer transition-colors duration-150 ease-in-out"
      onClick={() => onItemSelect(item)}
    >
      <td className="py-3 px-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="w-8 h-8 mr-3 bg-gray-300 rounded flex items-center justify-center text-gray-500 text-xs overflow-hidden">
            {/* 아이콘 표시 로직 수정 */}
            {iconDisplayUrl ? (
              <img src={iconDisplayUrl} alt={itemName} className="w-full h-full object-cover" />
            ) : (
              itemId ? String(itemId).substring(0, 1) : "?"
            )}
          </div>
          <span className={`font-medium ${qualityClass}`}>{itemName}</span>
        </div>
      </td>
      {/* AuctionItem 타입에 level, item_level 없음 - 제거 
      <td className="py-3 px-4 text-center whitespace-nowrap text-sm text-gray-600">{item.level || item.item_level || '-'}</td>
      */}
      <td className="py-3 px-4 text-right whitespace-nowrap">
        <CurrencyDisplay totalCopper={buyoutPrice || 0} />
      </td>
      {/* AuctionItem 타입에 timeLeft, time_left 없음 - 제거
      <td className="py-3 px-4 text-center whitespace-nowrap text-sm text-gray-600">{item.timeLeft || item.time_left || '-'}</td> 
      */}
      {/* TODO: 필요시 입찰가, 판매자 등 추가 컬럼 */}
    </tr>
  );
} 