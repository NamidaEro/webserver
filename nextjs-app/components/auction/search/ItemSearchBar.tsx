export default function ItemSearchBar() {
  // TODO: 검색 로직 및 상태 관리 추가
  return (
    <div className="w-full max-w-md">
      <label htmlFor="item-search" className="sr-only">
        아이템 검색
      </label>
      <input
        type="search"
        name="item-search"
        id="item-search"
        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
        placeholder="아이템 이름으로 검색..."
        // onChange={(e) => setSearchTerm(e.target.value)} // 예시
      />
    </div>
  );
} 