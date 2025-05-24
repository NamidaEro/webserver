import React from 'react';
import { AuctionItem, IndividualAuction } from '@/lib/types/auction';
import CurrencyDisplay from '../common/CurrencyDisplay';

interface AuctionItemDetailModalProps {
  item: AuctionItem | null;
  allAuctionsForItem: IndividualAuction[];
  isLoadingDetails: boolean;
  isOpen: boolean;
  onClose: () => void;
}

const qualityColorClasses: { [key: string]: string } = {
  poor: 'text-gray-500',
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
  allAuctionsForItem,
  isLoadingDetails,
  isOpen,
  onClose,
}: AuctionItemDetailModalProps) {
  if (!isOpen || !item) return null;

  const qualityClass = item.item_quality ? 
    qualityColorClasses[item.item_quality.toLowerCase()] || 'text-white' : 
    'text-white';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-4xl max-h-[80vh] overflow-hidden">
        {/* 모달 헤더 */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center">
            {item.icon_url && (
              <div className="w-12 h-12 mr-4 rounded overflow-hidden">
                <img src={item.icon_url} alt={item.item_name} className="w-full h-full object-cover" />
              </div>
            )}
            <h2 className={`text-2xl font-bold ${qualityClass}`}>
              {item.item_name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 모달 내용 */}
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-8rem)]">
          {isLoadingDetails ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : (
            <>
              {/* 경매 목록 테이블 */}
              <div className="overflow-x-auto">
                <table className="min-w-full bg-gray-900 rounded-lg">
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="py-3 px-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        판매자
                      </th>
                      <th className="py-3 px-4 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        수량
                      </th>
                      <th className="py-3 px-4 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        개당 가격
                      </th>
                      <th className="py-3 px-4 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        총 가격
                      </th>
                      <th className="py-3 px-4 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        남은 시간
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {allAuctionsForItem.map((auction, index) => (
                      <tr key={index} className="hover:bg-gray-700 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap text-gray-300">
                          {auction.seller || '알 수 없음'}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap text-gray-300">
                          {auction.quantity}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <CurrencyDisplay totalCopper={auction.unit_price} />
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <CurrencyDisplay totalCopper={auction.unit_price * auction.quantity} />
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap text-gray-300">
                          {auction.time_left || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 경매가 없을 경우 메시지 */}
              {allAuctionsForItem.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  현재 진행 중인 경매가 없습니다.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
} 