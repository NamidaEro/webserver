import React, { useState, useEffect } from 'react';
import { AuctionItem } from '@/lib/types/auction';
import AuctionItemRow from './AuctionItemRow';
// import ItemSearchBar from '@/components/auction/search/ItemSearchBar'; // 검색창 컴포넌트 import 제거
// import PriceHistoryChart from '@/components/auction/chart/PriceHistoryChart'; // 나중에 추가
// import Modal from '@/components/shared/Modal'; // 나중에 추가

interface AuctionTableProps {
  items: AuctionItem[];
  onItemSelect: (item: AuctionItem) => void;
  // TODO: 정렬 관련 props 추가 (예: onSort, currentSortKey, currentSortOrder)
}

// 임시 Mock 데이터 - AuctionItem 타입에 맞게 수정
const mockAuctionItems: AuctionItem[] = [];

export default function AuctionTable({ items = mockAuctionItems, onItemSelect }: AuctionTableProps) {
  const [selectedItem, setSelectedItem] = useState<AuctionItem | null>(null);
  // const [searchTerm, setSearchTerm] = useState(''); // 검색어 상태 제거
  
  useEffect(() => {
    console.log('[AuctionTable] 컴포넌트가 마운트되었습니다');
    console.log('[AuctionTable] 받은 아이템 데이터:', items);
    console.log('[AuctionTable] 아이템 개수:', items?.length || 0);
    
    if (items && items.length > 0) {
      console.log('[AuctionTable] 첫 번째 아이템의 속성:', Object.keys(items[0]));
      console.log('[AuctionTable] 첫 번째 아이템:', items[0]);
    }
  }, [items]);

  const handleItemSelect = (item: AuctionItem) => {
    console.log('[AuctionTable] 아이템 선택됨:', item);
    setSelectedItem(item);
    console.log('Selected item:', item);
  };

  const handleCloseModal = () => {
    setSelectedItem(null);
  };

  // const handleSearchTermChange = (term: string) => { // 검색어 변경 핸들러 제거
  //   setSearchTerm(term);
  // };

  console.log('[AuctionTable] 렌더링 전 아이템 확인:', items);
  
  // const filteredItems = items.filter(item =>  // 필터링 로직 제거
  //   (item.item_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
  //   String(item.item_id).includes(searchTerm)
  // );

  // 검색 결과 없을 때 메시지 처리 로직 제거
  // if (items && items.length > 0 && filteredItems.length === 0) {
  //   console.log('[AuctionTable] 검색 결과 없음. 검색어:', searchTerm);
  //   return (
  //     <>
  //       <div className="overflow-x-auto shadow-md rounded-lg">
  //         {/* <ItemSearchBar searchTerm={searchTerm} onSearchTermChange={handleSearchTermChange} /> */}
  //         <p className="text-center text-gray-500 py-8">'{searchTerm}'에 대한 검색 결과가 없습니다.</p>
  //       </div>
  //     </>
  //   );
  // }
  
  // if (!items || items.length === 0) {
  //   console.log('[AuctionTable] 아이템이 없습니다. items:', items);
  //   return <p className="text-center text-gray-500 py-8">표시할 경매 아이템이 없습니다.</p>;
  // }

  console.log('[AuctionTable] 맵핑할 아이템 수:', items.length);

  return (
    <>
      <div className="overflow-x-auto shadow-md rounded-lg">
        {/* <ItemSearchBar searchTerm={searchTerm} onSearchTermChange={handleSearchTermChange} /> */}{/* 검색 바 제거 */}
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
            {items.map((item, index) => { // filteredItems 대신 items 사용
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