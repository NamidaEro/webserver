import React from 'react';

interface ItemSearchBarProps {
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  placeholder?: string;
}

export default function ItemSearchBar({ 
  searchTerm, 
  onSearchTermChange, 
  placeholder = "아이템 이름으로 검색..." 
}: ItemSearchBarProps) {
  return (
    <div className="mb-4 md:mb-0"> {/* 모바일에서는 하단 마진, md 이상에서는 마진 없음 */}
      <input
        type="text"
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => onSearchTermChange(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
      />
    </div>
  );
} 