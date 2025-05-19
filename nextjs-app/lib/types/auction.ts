export interface AuctionItem {
  // 기존 클라이언트 타입
  id?: number;
  itemId?: number;
  name?: string;
  iconUrl?: string;
  level?: number;
  quality?: string;
  quantity?: number;
  buyoutPrice?: number;
  bidPrice?: number;
  timeLeft?: string;
  
  // API 응답 타입
  _id?: string;
  blizzard_auction_id?: number;
  item_id?: number;
  buyout?: number;
  time_left?: string;
  item_level?: number;
  item_name?: string;   // 백엔드에서 추가된 아이템 이름 필드
  item_quality?: string; // 백엔드에서 추가된 아이템 품질 필드
  
  // 아이템 상세 정보 객체 (Blizzard API 응답)
  item_obj?: {
    id?: number;
    name?: string | { ko_KR?: string; [key: string]: any };
    quality?: string | number | { type?: string; [key: string]: any };
    level?: number;
    icon?: string;
    [key: string]: any; // 나머지 모든 필드는 any 타입
  };
}

// 화폐 단위를 위한 타입 (선택적)
export interface Currency {
  gold: number;
  silver: number;
  copper: number;
} 