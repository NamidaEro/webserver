import React from 'react';
import './AuctionsSubClassesTab.css';

interface ItemSubclass {
  id: number;
  name: string;
}

interface AuctionsSubClassesTabProps {
  itemClassName: string;
  subclasses: ItemSubclass[];
  selectedSubclasses: number[];
  isLoading: boolean;
  error?: string | null;
  onSubclassSelection: (subclassId: number) => void;
}

const AuctionsSubClassesTab: React.FC<AuctionsSubClassesTabProps> = ({
  itemClassName,
  subclasses,
  selectedSubclasses,
  isLoading,
  error,
  onSubclassSelection
}) => {  return (
    <div className="subclasses-container">
      {/* <div className="subclasses-title">
        {itemClassName} Subclasses
      </div> */}
      
      {isLoading ? (
        <div className="subclasses-loading">로딩 중...</div>
      ) : error ? (
        <div className="subclasses-error">
          에러: {error}
        </div>
      ) : subclasses.length > 0 ? (
        <div className="subclasses-grid">
          {subclasses.map((subclass) => (
            <div 
              key={subclass.id}
              className={`subclass-item ${selectedSubclasses.includes(subclass.id) ? 'selected' : ''}`}
              onClick={() => onSubclassSelection(subclass.id)}
            >
              {subclass.name}
            </div>
          ))}
        </div>
      ) : (
        <div className="subclasses-empty">서브클래스가 없습니다</div>
      )}
    </div>
  );
};

export default AuctionsSubClassesTab;
