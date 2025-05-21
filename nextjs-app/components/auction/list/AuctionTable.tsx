import React, { useState, useEffect } from 'react';
import { AuctionItem } from '@/lib/types/auction';
import AuctionItemRow from './AuctionItemRow';
// import PriceHistoryChart from '@/components/auction/chart/PriceHistoryChart'; // 나중에 추가
// import Modal from '@/components/shared/Modal'; // 나중에 추가

interface AuctionTableProps {
  items: AuctionItem[];
  onItemSelect: (item: AuctionItem) => void;
  // TODO: 정렬 관련 props 추가 (예: onSort, currentSortKey, currentSortOrder)
}

// 임시 Mock 데이터 - AuctionItem 타입에 맞게 수정
const mockAuctionItems: AuctionItem[] = [
  {
    id: 'mock-1', // 문자열로 변경
    item_id: 19019, // itemId -> item_id
    item_name: '천둥격노 - 바람추적자의 성검', // name -> item_name
    icon_url: 'https://wow.zamimg.com/images/wow/icons/large/inv_sword_34.jpg',
    item_quality: 'legendary', // quality -> item_quality
    quantity: 1,
    buyout: 150000000, // buyoutPrice -> buyout
    // level, timeLeft는 AuctionItem 타입에 없음 - 제거
  },
  {
    id: 'mock-2', // 문자열로 변경
    item_id: 17182, // itemId -> item_id
    item_name: '아지노스의 전투검 (주 장비)', // name -> item_name
    icon_url: 'https://wow.zamimg.com/images/wow/icons/large/inv_sword_68.jpg',
    item_quality: 'legendary', // quality -> item_quality
    quantity: 1,
    buyout: 25000000, // buyoutPrice -> buyout
    // level, timeLeft는 AuctionItem 타입에 없음 - 제거
  },
  {
    id: 'mock-3', // 문자열로 변경
    item_id: 32837, // itemId -> item_id
    item_name: '설퍼라스 - 꺼지지 않는 손길', // name -> item_name
    icon_url: 'https://wow.zamimg.com/images/wow/icons/large/inv_mace_34.jpg',
    item_quality: 'epic', // quality -> item_quality
    quantity: 1,
    buyout: 5000000, // buyoutPrice -> buyout
    // level, timeLeft는 AuctionItem 타입에 없음 - 제거
  },
  {
    id: 'mock-4', // 문자열로 변경
    item_id: 18582, // itemId -> item_id
    item_name: '아케이나이트 도끼', // name -> item_name
    icon_url: 'https://wow.zamimg.com/images/wow/icons/large/inv_axe_09.jpg',
    item_quality: 'rare', // quality -> item_quality
    quantity: 5,
    buyout: 150000, // buyoutPrice -> buyout
    // level, timeLeft는 AuctionItem 타입에 없음 - 제거
  },
  {
    id: 'mock-5', // 문자열로 변경
    item_id: 49623, // itemId -> item_id
    item_name: '왕의 M이다!', // name -> item_name
    icon_url: 'https://wow.zamimg.com/images/wow/icons/large/inv_sword_136.jpg',
    item_quality: 'uncommon', // quality -> item_quality
    quantity: 10,
    buyout: 12055, // buyoutPrice -> buyout
    // level, timeLeft는 AuctionItem 타입에 없음 - 제거
  },
];

export default function AuctionTable({ items = mockAuctionItems, onItemSelect }: AuctionTableProps) { // items prop 기본값을 mock 데이터로 설정
  const [selectedItem, setSelectedItem] = useState<AuctionItem | null>(null);
  
  useEffect(() => {
    console.log('[AuctionTable] 컴포넌트가 마운트되었습니다');
    console.log('[AuctionTable] 받은 아이템 데이터:', items);
    console.log('[AuctionTable] 아이템 개수:', items?.length || 0);
    
    // 아이템의 키와 구조 확인
    if (items && items.length > 0) {
      console.log('[AuctionTable] 첫 번째 아이템의 속성:', Object.keys(items[0]));
      console.log('[AuctionTable] 첫 번째 아이템:', items[0]);
    }
  }, [items]);

  const handleItemSelect = (item: AuctionItem) => {
    console.log('[AuctionTable] 아이템 선택됨:', item);
    setSelectedItem(item);
    // TODO: 모달 열기 또는 상세 정보 표시 로직
    console.log('Selected item:', item);
  };

  const handleCloseModal = () => {
    setSelectedItem(null);
  };

  console.log('[AuctionTable] 렌더링 전 아이템 확인:', items);
  
  if (!items || items.length === 0) {
    console.log('[AuctionTable] 아이템이 없습니다. items:', items);
    return <p className="text-center text-gray-500 py-8">표시할 경매 아이템이 없습니다.</p>;
  }

  // 렌더링 전에 맵핑할 아이템 수 로그
  console.log('[AuctionTable] 맵핑할 아이템 수:', items.length);

  return (
    <>
      <div className="overflow-x-auto shadow-md rounded-lg">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-200">
            <tr>
              <th scope="col" className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                아이템
              </th>
              {/* AuctionItem 타입에 level 정보 없으므로 헤더 제거
              <th scope="col" className="py-3 px-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                레벨
              </th>
              */}
              <th scope="col" className="py-3 px-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                즉시 구매가
              </th>
              {/* AuctionItem 타입에 timeLeft 정보 없으므로 헤더 제거
              <th scope="col" className="py-3 px-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                남은 시간
              </th>
              */}
              {/* TODO: 클릭 시 정렬 기능 추가 */}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((item, index) => {
              console.log(`[AuctionTable] 아이템 ${index} 렌더링:`, item);
              console.log(`[AuctionTable] 아이템 ${index}의 키:`, item.id || item.item_id);
              return (
                <AuctionItemRow 
                  key={item.id || item.item_id || index}
                  item={item} 
                  onItemSelect={onItemSelect}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 아이템 상세 정보 모달 (나중에 구현) */}
      {/* {selectedItem && (
        <Modal isOpen={!!selectedItem} onClose={handleCloseModal} title={selectedItem.name}>
          <PriceHistoryChart itemId={selectedItem.itemId} />
          <p>아이템 ID: {selectedItem.itemId}</p>
          <p>가격 변동 그래프가 여기에 표시됩니다.</p>
        </Modal>
      )} */}
    </>
  );
} 