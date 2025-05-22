export interface ItemSubObject {
  id: number; // 실제 고유 아이템 ID
  // name: string; // item_name으로 최상위에 이미 존재하므로 중복될 수 있음. API 응답 확인 필요
  // quality: string; // item_quality로 최상위에 이미 존재하므로 중복될 수 있음. API 응답 확인 필요
}

export interface AuctionItem {
  // 최상위 레벨의 id는 개별 경매 ID (MongoDB _id 또는 Blizzard auction_id)일 가능성이 높음
  id: string; // MongoDB _id 또는 blizzard_auction_id (실제로는 representative_auction의 _id 또는 blizzard_auction_id)
  blizzard_auction_id?: number; // API 응답에 따라 blizzard_auction_id (두 번째 이미지의 최상위 id 필드)
  
  item: ItemSubObject; // 중첩된 item 객체 (고유 아이템 정보 포함)
  
  // 기존 최상위 필드 (백엔드 API가 이렇게 가공해서 준다고 가정)
  item_id: number; // 이 필드가 item.id와 동일한 값을 가지는지, 아니면 다른 의미인지 확인 필요. JSON상으로는 item.id가 고유 아이템 ID로 보임.
  item_name: string;
  item_quality: string; 
  icon_url: string | null;
  unit_price: number | null; // 가격이 없을 수도 있으므로 null 허용
  quantity: number; 
}

export interface AuctionResponse {
  status: string;
  total_count: number;
  auctions: AuctionItem[];
  cache_status: string;
}

export interface IndividualAuction {
  _id: string; 
  blizzard_auction_id?: number; 
  item_id: number; // 이 item_id가 AuctionItem의 item.id와 연결되는지 확인 필요
  quantity: number;
  unit_price: number | null;
  time_left?: string; 
  collection_time: string; 
  realm_id: number | string; // realm_id가 숫자일 수도, "commodities_xx" 형태일 수도 있음
  // IndividualAuction에는 AuctionItem과 달리 item_name, item_quality, icon_url이 없을 수 있음 (API 응답 확인)
  // 필요하다면, 모달에서 표시하기 위해 이 정보들을 AuctionItem으로부터 받아오거나, API 응답에 포함되어야 함.
}

export interface AuctionsByItemResponse {
  status: string;
  realm_id: number | string;
  item_id: number;
  auctions: IndividualAuction[];
  count: number;
}

export interface ItemMetadata {
  _id: string;
  item_id: number;
  name: string;
  quality: string;
  icon_url: string; // icon -> icon_url (다른 타입과 일관성)
}

// 화폐 단위를 위한 타입 (선택적)
export interface Currency {
  gold: number;
  silver: number;
  copper: number;
} 