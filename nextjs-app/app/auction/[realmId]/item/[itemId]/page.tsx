import { AuctionsByItemResponse, IndividualAuction, ItemMetadata } from '@/lib/types/auction';
import Link from 'next/link';

async function getItemAuctions(realmId: string, itemId: string): Promise<AuctionsByItemResponse | null> {
  try {
    const res = await fetch(`/api/auctions-by-item?realmId=${realmId}&itemId=${itemId}`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      console.error(`Error fetching item auctions: ${res.status} ${res.statusText}`);
      const errorBody = await res.text();
      console.error(`Error body: ${errorBody}`);
      return null;
    }
    return res.json();
  } catch (error) {
    console.error('Failed to fetch item auction data:', error);
    return null;
  }
}

async function getItemMetadata(itemId: string): Promise<ItemMetadata | null> {
  try {
    const res = await fetch(`/api/item-metadata/${itemId}`, {
      cache: 'no-store', 
    });
    if (!res.ok) {
      console.error(`Error fetching item metadata: ${res.status} ${res.statusText}`);
      return null;
    }
    const data = await res.json();
    return data.status === 'ok' ? data.item : null;
  } catch (error) {
    console.error('Failed to fetch item metadata:', error);
    return null;
  }
}


interface ItemDetailPageProps {
  params: {
    realmId: string;
    itemId: string;
  };
}

export default async function ItemDetailPage({ params }: ItemDetailPageProps) {
  const { realmId, itemId } = params;
  const [itemAuctionsData, itemMetadata] = await Promise.all([
    getItemAuctions(realmId, itemId),
    getItemMetadata(itemId)
  ]);

  if (!itemAuctionsData || itemAuctionsData.status !== 'ok' || !itemAuctionsData.auctions) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-xl font-bold">아이템 정보 (ID: {itemId})</h1>
        <p>아이템의 경매 정보를 불러오는데 실패했습니다.</p>
        {itemAuctionsData && itemAuctionsData.status !== 'ok' && <p>오류: {JSON.stringify(itemAuctionsData)}</p>}
        <Link href={`/auction/${realmId}`} legacyBehavior><a className="text-blue-500 hover:underline">목록으로 돌아가기</a></Link>
      </div>
    );
  }

  const auctions = itemAuctionsData.auctions;
  const itemName = itemMetadata?.name || `아이템 #${itemId}`;
  const itemIcon = itemMetadata?.icon; //  메타데이터의 아이콘을 우선 사용
  const itemQuality = itemMetadata?.quality || 'common';

  return (
    <div className="container mx-auto p-4 text-white">
      <Link href={`/auction/${realmId}`} legacyBehavior><a className="text-blue-400 hover:underline mb-4 block">&lt; 목록으로 돌아가기</a></Link>
      
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-full md:w-1/3 flex flex-col items-center md:items-start">
            {itemIcon && (
              <img src={itemIcon} alt={itemName} className="w-20 h-20 rounded border-2 border-gray-600 mb-4" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}/>
            )}
            <h1 className={`text-2xl font-bold mb-1 quality-${itemQuality?.toLowerCase()}`}>{itemName}</h1>
            <p className={`text-sm capitalize mb-4 item-quality quality-${itemQuality?.toLowerCase()}`}>{itemQuality}</p>
            
            <div className="w-full bg-gray-700 p-4 rounded mb-4">
              <label htmlFor="quantityInput" className="block text-sm font-medium text-gray-300 mb-1">수량</label>
              <input type="number" id="quantityInput" name="quantityInput" defaultValue="1" min="1" 
                     className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white focus:ring-blue-500 focus:border-blue-500"/>
              
              <div className="mt-3">
                <p className="text-sm text-gray-400">개당 가격: <span className="text-yellow-400">
                  {auctions.length > 0 && auctions[0].buyout && auctions[0].quantity ? 
                    (auctions[0].buyout / auctions[0].quantity / 10000).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) + " G"
                    : "N/A"}
                  </span></p>
                <p className="text-sm text-gray-400">총 가격: <span className="text-yellow-400">
                  {auctions.length > 0 && auctions[0].buyout ? 
                    (auctions[0].buyout / 10000).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) + " G"
                    : "N/A"}
                  </span> (수량 1개 기준, 첫 매물 기준)</p>
              </div>
              <button className="mt-4 w-full bg-yellow-600 hover:bg-yellow-700 text-black font-bold py-2 px-4 rounded">
                구매
              </button>
            </div>
          </div>

          <div className="w-full md:w-2/3">
            <h2 className="text-xl font-semibold mb-3 border-b border-gray-700 pb-2">등록된 매물 ({auctions.length}개)</h2>
            {auctions.length > 0 ? (
              <ul className="space-y-2 max-h-96 overflow-y-auto pr-2">
                {auctions.map((auc) => (
                  <li key={auc._id || auc.blizzard_auction_id} className="flex justify-between items-center bg-gray-750 p-3 rounded hover:bg-gray-700">
                    <div>
                      <p className="text-sm">수량: <span className="font-medium">{auc.quantity}</span>개</p>
                    </div>
                    <div>
                      <p className="text-sm">개당 가격: <span className="font-medium text-yellow-400">
                        {auc.buyout && auc.quantity ? 
                         (auc.buyout / auc.quantity / 10000).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) + " G" 
                         : "N/A" }
                        </span></p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400">현재 이 아이템의 매물이 없습니다.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 