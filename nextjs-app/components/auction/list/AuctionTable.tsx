import React, { useState } from 'react';
import { AuctionItem, IndividualAuction } from '@/lib/types/auction';
import AuctionItemRow from './AuctionItemRow';
import AuctionItemDetailModal from '../detail/AuctionItemDetailModal';

interface AuctionTableProps {
  items: AuctionItem[];
  realmId?: string;
  onItemSelect?: (item: AuctionItem) => Promise<void>;
}

export default function AuctionTable({ items, realmId, onItemSelect }: AuctionTableProps) {
  const [selectedItem, setSelectedItem] = useState<AuctionItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [itemAuctions, setItemAuctions] = useState<IndividualAuction[]>([]);

  const handleItemSelect = async (item: AuctionItem) => {
    if (onItemSelect) {
      await onItemSelect(item);
      return;
    }

    setSelectedItem(item);
    setIsModalOpen(true);
    setIsLoadingDetails(true);
    
    try {
      if (!realmId) {
        throw new Error('Realm ID is required to fetch auctions');
      }
      const response = await fetch(`/api/auctions/${realmId}?itemId=${item.item_id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch auctions');
      }
      
      const data = await response.json();
      setItemAuctions(data as IndividualAuction[]);
    } catch (error) {
      console.error('Error fetching auctions:', error);
      setItemAuctions([]);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
    setItemAuctions([]);
  };

  if (!items || items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        표시할 경매 아이템이 없습니다.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto shadow-md rounded-lg">
        <table className="min-w-full bg-white">
          <thead className="bg-gray-200">
            <tr>
              <th scope="col" className="py-3 px-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                아이템
              </th>
              <th scope="col" className="py-3 px-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                수량
              </th>
              <th scope="col" className="py-3 px-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                최저가
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items.map((item, index) => (
              <AuctionItemRow 
                key={`${item.item_id}-${index}`}
                item={item} 
                onItemSelect={handleItemSelect}
              />
            ))}
          </tbody>
        </table>
      </div>

      <AuctionItemDetailModal
        item={selectedItem}
        allAuctionsForItem={itemAuctions}
        isLoadingDetails={isLoadingDetails}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </>
  );
} 