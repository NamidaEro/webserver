import React from 'react';

interface Category {
  id: string;
  name: string;
  // subCategories?: Category[]; // 필요시 하위 카테고리
}

// 임시 카테고리 데이터 (나중에 실제 데이터로 교체)
const tempCategories: Category[] = [
  { id: 'weapon', name: '무기' },
  { id: 'armor', name: '방어구' },
  { id: 'consumable', name: '소비용품' },
  { id: 'gem', name: '보석' },
  { id: 'glyph', name: '문양' },
  { id: 'trade_goods', name: '재료' },
  { id: 'recipe', name: '제조법' },
  { id: 'quest', name: '퀘스트 아이템' },
];

interface AuctionSidebarProps {
  categories?: Category[];
  selectedCategory: string | null;
  onSelectCategory: (categoryId: string | null) => void;
}

export default function AuctionSidebar({
  categories = tempCategories, // 기본값으로 임시 데이터 사용
  selectedCategory,
  onSelectCategory,
}: AuctionSidebarProps) {
  return (
    <aside className="w-full md:w-64 bg-gray-100 p-4 shadow rounded-lg md:mr-6 mb-6 md:mb-0">
      <h2 className="text-xl font-semibold mb-4 text-gray-700">아이템 카테고리</h2>
      <nav>
        <ul>
          {/* "전체 보기" 옵션 */} 
          <li key="all-categories" className="mb-2">
            <button
              onClick={() => onSelectCategory(null)} // null을 전달하여 전체 선택을 나타냄
              className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium 
                          ${selectedCategory === null 
                            ? 'bg-blue-500 text-white' 
                            : 'text-gray-700 hover:bg-gray-200 hover:text-gray-900'}
                          focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors`}
            >
              전체 보기
            </button>
          </li>

          {categories.map((category) => (
            <li key={category.id} className="mb-2">
              <button
                onClick={() => onSelectCategory(category.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium 
                            ${selectedCategory === category.id 
                              ? 'bg-blue-500 text-white' 
                              : 'text-gray-700 hover:bg-gray-200 hover:text-gray-900'}
                            focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors`}
              >
                {category.name}
              </button>
              {/* TODO: 하위 카테고리 렌더링 (필요시) */}
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
} 