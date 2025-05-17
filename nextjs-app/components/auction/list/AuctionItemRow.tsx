import React from 'react';
import Image from 'next/image'; // Next.js Image 컴포넌트 사용 고려
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
  const nameColor = item.quality ? qualityColorClasses[item.quality.toLowerCase()] || 'text-gray-700' : 'text-gray-700';

  return (
    <tr 
      className="border-b border-gray-200 hover:bg-gray-100 cursor-pointer transition-colors duration-150 ease-in-out"
      onClick={() => onItemSelect(item)}
    >
      <td className="py-3 px-4 whitespace-nowrap">
        <div className="flex items-center">
          {item.iconUrl ? (
            <Image src={item.iconUrl} alt={item.name} width={32} height={32} className="w-8 h-8 mr-3 rounded" />
          ) : (
            <div className="w-8 h-8 mr-3 bg-gray-300 rounded flex items-center justify-center text-gray-500 text-xs">
              ? {/* 아이콘 없을 시 */}
            </div>
          )}
          <span className={`font-medium ${nameColor}`}>{item.name}</span>
        </div>
      </td>
      <td className="py-3 px-4 text-center whitespace-nowrap text-sm text-gray-600">{item.level || '-'}</td>
      <td className="py-3 px-4 text-right whitespace-nowrap">
        <CurrencyDisplay totalCopper={item.buyoutPrice} />
      </td>
      <td className="py-3 px-4 text-center whitespace-nowrap text-sm text-gray-600">{item.quantity}</td>
      <td className="py-3 px-4 text-center whitespace-nowrap text-sm text-gray-600">{item.timeLeft || '-'}</td> 
      {/* TODO: 필요시 입찰가, 판매자 등 추가 컬럼 */}
    </tr>
  );
} 