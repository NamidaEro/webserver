import { AuctionResponse, AuctionItem } from '@/lib/types/auction';
import Link from 'next/link';

async function getAuctions(realmId: string): Promise<AuctionResponse | null> {
  try {
    const res = await fetch(`/api/auctions/${realmId}`, {
      cache: 'no-store', 
    });
    if (!res.ok) {
      console.error(`Error fetching auctions: ${res.status} ${res.statusText}`);
      const errorBody = await res.text();
      console.error(`Error body: ${errorBody}`);
      return null;
    }
    return res.json();
  } catch (error) {
    console.error('Failed to fetch auction data:', error);
    return null;
  }
}

interface AuctionPageProps {
  params: {
    realmId: string;
  };
}

export default async function AuctionPage({ params }: AuctionPageProps) {
  const { realmId } = params;
  const auctionData = await getAuctions(realmId);

  if (!auctionData || auctionData.status !== 'ok' || !auctionData.auctions) {
    return (
      <div>
        <h1>경매 정보 ({realmId} 서버)</h1>
        <p>경매 데이터를 불러오는데 실패했습니다.</p>
        {auctionData && auctionData.status !== 'ok' && <p>오류: {JSON.stringify(auctionData)}</p>}
      </div>
    );
  }

  const items = auctionData.auctions;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">경매장 (서버 ID: {realmId}) - 총 {auctionData.total_count}개 아이템</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {items.map((item) => (
          <Link key={item.id || item.item_id} href={`/auction/${realmId}/item/${item.item_id}`} legacyBehavior>
            <a className="border rounded-lg p-3 hover:shadow-lg transition-shadow bg-gray-800 text-white block">
              {item.icon_url && (
                <img 
                  src={item.icon_url} 
                  alt={item.item_name} 
                  className="w-16 h-16 mx-auto mb-2 rounded border border-gray-600" 
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              <h2 className="text-sm font-semibold truncate quality-common" title={item.item_name}>{item.item_name}</h2>
              <p className={`text-xs item-quality quality-${item.item_quality?.toLowerCase()}`}>{item.item_quality}</p>
              <p className="text-xs text-gray-400">
                가격: {item.buyout ? (item.buyout / 10000).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 2}) : 'N/A'} <span className="text-yellow-500">G</span>
              </p>
              <p className="text-xs text-gray-400">수량: {item.quantity != null ? item.quantity : 'N/A'}</p>
            </a>
          </Link>
        ))}
      </div>
      {items.length === 0 && <p>표시할 아이템이 없습니다.</p>}
    </div>
  );
} 