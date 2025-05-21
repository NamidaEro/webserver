export interface AuctionItem {
  item_id: number;
  item_name: string;
  item_quality: string; // 예: "common", "uncommon", "rare", "epic", "legendary"
  icon_url: string | null;
  buyout: number; 
  id: string; // MongoDB _id 또는 blizzard_auction_id (실제로는 representative_auction의 _id 또는 blizzard_auction_id)
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
  blizzard_auction_id?: number; // API 응답에 따라 선택적일 수 있음
  item_id: number;
  quantity: number;
  buyout: number; 
  time_left?: string; 
  collection_time: string; 
  realm_id: number;
}

export interface AuctionsByItemResponse {
  status: string;
  realm_id: number;
  item_id: number;
  auctions: IndividualAuction[];
  count: number;
}

export interface ItemMetadata {
  _id: string;
  item_id: number;
  name: string;
  quality: string;
  icon: string;
}

// 화폐 단위를 위한 타입 (선택적)
export interface Currency {
  gold: number;
  silver: number;
  copper: number;
} 