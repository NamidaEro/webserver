export interface ItemSubObject {
  id: number; // 실제 고유 아이템 ID
  // name: string; // item_name으로 최상위에 이미 존재하므로 중복될 수 있음. API 응답 확인 필요
  // quality: string; // item_quality로 최상위에 이미 존재하므로 중복될 수 있음. API 응답 확인 필요
}

export interface AuctionItem {
  item_id: number;
  item_name: string;
  unit_price: number;
  quantity: number;
  icon_url?: string;
  item_quality?: string;
  realm_id: string;
}

export interface AuctionResponse {
  status: 'ok' | 'error';
  auctions: AuctionItem[];
}

export interface IndividualAuction extends AuctionItem {
  seller?: string;
  time_left?: string;
}

export interface AuctionsByItemResponse {
  status: 'ok' | 'error';
  auctions: IndividualAuction[];
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