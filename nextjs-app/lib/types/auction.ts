export interface AuctionItem {
  id: number;
  itemId: number; // 블리자드 아이템 ID
  name: string;
  iconUrl?: string; // 아이템 아이콘 URL (선택적)
  level?: number;   // 아이템 레벨 (선택적)
  quality?: string; // 아이템 등급 (예: "epic", "rare") - 스타일에 사용
  quantity: number;
  buyoutPrice: number; // 즉시 구매가 (코퍼 단위)
  bidPrice?: number;   // 입찰가 (코퍼 단위, 선택적)
  timeLeft?: string;  // 남은 시간 (예: "매우 김", "12시간")
}

// 화폐 단위를 위한 타입 (선택적)
export interface Currency {
  gold: number;
  silver: number;
  copper: number;
} 