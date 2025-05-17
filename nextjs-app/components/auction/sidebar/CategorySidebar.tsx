const tempCategories = [
  { id: 'weapon', name: '무기' },
  { id: 'armor', name: '방어구' },
  { id: 'consumable', name: '소비용품' },
  { id: 'gem', name: '보석' },
  { id: 'glyph', name: '문양' },
  { id: 'trade_goods', name: '재료' },
  { id: 'recipe', name: '제조법' },
  { id: 'quest', name: '퀘스트 아이템' },
];

export default function CategorySidebar() {
  return (
    <nav aria-label="아이템 카테고리">
      <ul className="space-y-2">
        {tempCategories.map((category) => (
          <li key={category.id}>
            <a
              href="#" // TODO: 실제 필터링 로직 연결
              className="block px-3 py-2 rounded-md text-gray-700 hover:bg-gray-200 hover:text-gray-900"
            >
              {category.name}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
} 