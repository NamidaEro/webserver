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
  const itemId = item.itemId || item.item_id; // API는 item_id 사용
  const buyoutPrice = item.buyoutPrice || item.buyout; // API는 buyout 사용
  
  // 아이템 이름 추출 - 우선순위: item_name -> name -> item_obj.name -> 아이템 ID 사용
  let itemName = item.item_name || item.name;
  if (!itemName && item.item_obj) {
    // 직접 name 속성이 있는지 확인
    if (typeof item.item_obj.name === 'string') {
      itemName = item.item_obj.name;
    } 
    // Blizzard API 형식: name 객체가 있고 로케일별 이름이 있는지
    else if (item.item_obj.name && item.item_obj.name.ko_KR) {
      itemName = item.item_obj.name.ko_KR;
    }
    // id 필드가 있을 수 있는 다른 경로
    else if (item.item_obj.id) {
      itemName = `아이템 #${item.item_obj.id}`;
    }
  }
  
  // 여전히 이름이 없으면 item_id로 대체
  if (!itemName) {
    itemName = `아이템 #${itemId || '알 수 없음'}`;
  }
  
  // 아이템 품질(등급) 확인 - 우선순위: item_quality -> quality -> item_obj.quality
  let quality = item.item_quality || item.quality;
  if (!quality && item.item_obj && item.item_obj.quality) {
    // quality 값이 객체인지 확인
    if (typeof item.item_obj.quality === 'object' && item.item_obj.quality.type) {
      quality = item.item_obj.quality.type.toLowerCase();
    } 
    // 직접 문자열 값인지 확인
    else if (typeof item.item_obj.quality === 'string') {
      quality = item.item_obj.quality.toLowerCase();
    }
    // 숫자 ID가 있는지 확인 (WoW API는 quality를 숫자로 제공할 수 있음)
    else if (typeof item.item_obj.quality === 'number') {
      // 0 = 일반, 1 = 고급, 2 = 희귀, 3 = 영웅, 4 = 전설 등의 매핑
      const qualityMap: {[key: number]: string} = {
        0: 'poor',
        1: 'common',
        2: 'uncommon',
        3: 'rare',
        4: 'epic',
        5: 'legendary'
      };
      quality = qualityMap[item.item_obj.quality] || 'common';
    }
  }
  
  // quality가 없는 경우 기본값
  const qualityClass = quality ? 
    qualityColorClasses[quality.toLowerCase()] || 'text-gray-700' : 
    'text-gray-700';
  
  // iconUrl 사용 (백엔드에서 제공)
  const iconDisplayUrl = item.iconUrl || item.item_obj?.icon;

  console.log('[AuctionItemRow] 렌더링 아이템:', { 
    itemId, 
    buyoutPrice, 
    name: itemName,
    api_item_name: item.item_name, // API에서 제공한 이름 로그
    item_obj: item.item_obj
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
      <td className="py-3 px-4 text-center whitespace-nowrap text-sm text-gray-600">{item.level || item.item_level || '-'}</td>
      <td className="py-3 px-4 text-right whitespace-nowrap">
        <CurrencyDisplay totalCopper={buyoutPrice || 0} />
      </td>
      <td className="py-3 px-4 text-center whitespace-nowrap text-sm text-gray-600">{item.quantity || 1}</td>
      <td className="py-3 px-4 text-center whitespace-nowrap text-sm text-gray-600">{item.timeLeft || item.time_left || '-'}</td> 
      {/* TODO: 필요시 입찰가, 판매자 등 추가 컬럼 */}
    </tr>
  );
} 