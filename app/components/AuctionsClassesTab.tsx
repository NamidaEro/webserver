import React, { useState, useEffect } from 'react';
import AuctionsSubClassesTab from './AuctionsSubClassesTab';
import './AuctionsClassesTab.css';

interface ItemClass {
  id: number;
  name: string;
}

interface ItemSubclass {
  id: number;
  name: string;
}

interface AuctionsClassesTabProps {
  itemClasses: ItemClass[];
  selectedClassId: number | null;
  selectedItemClasses: number[];
  selectedSubclasses: number[];
  onItemClassClick: (classId: number) => void;
  onSubclassSelection: (subclassId: number) => void;
}

const AuctionsClassesTab: React.FC<AuctionsClassesTabProps> = ({
  itemClasses,
  selectedClassId,
  selectedItemClasses,
  selectedSubclasses,
  onItemClassClick,
  onSubclassSelection
}) => {  const [subclasses, setSubclasses] = useState<ItemSubclass[]>([]);
  const [loadingSubclasses, setLoadingSubclasses] = useState<boolean>(false);
  const [subclassError, setSubclassError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubclasses = async () => {
      if (selectedClassId === null) {
        setSubclasses([]);
        return;
      }

      setLoadingSubclasses(true);      setSubclassError(null); // 새 요청 시작 시 에러 초기화
      try {
        console.log(`Fetching subclasses for itemClassId: ${selectedClassId}`);
        const response = await fetch(`/api/item-subclasses?itemClassId=${selectedClassId}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`API Error (${response.status}):`, errorText);
          const errorMsg = `Failed to fetch item subclasses: ${response.status} ${response.statusText}`;
          setSubclassError(errorMsg);
          throw new Error(errorMsg);
        }
        
        const data = await response.json();
        console.log('Subclasses API response:', data);
        
        if (data && data.item_subclasses && Array.isArray(data.item_subclasses)) {
          const formattedSubclasses = data.item_subclasses.map((subclass: any) => ({
            id: subclass.id,
            name: typeof subclass.name === 'string' ? subclass.name : 
                (subclass.name && subclass.name.ko_KR ? subclass.name.ko_KR : 'Unknown')
          }));
          
          console.log('Formatted subclasses:', formattedSubclasses);
          setSubclasses(formattedSubclasses);
        } else {
          console.log('No subclasses found in API response');
          setSubclasses([]);
        }
      } catch (error) {
        console.error('Error fetching item subclasses:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error fetching subclasses';
        setSubclassError(errorMessage);
        setSubclasses([]);
      } finally {
        setLoadingSubclasses(false);
      }
    };

    fetchSubclasses();
  }, [selectedClassId]);
  return (
    <>
      {/* 상단 탭 메뉴 - 아이템 클래스 */}
      <div className="auctions-classes-container">
        <div className="auctions-classes-tab-menu">
          {itemClasses.map((itemClass) => (
            <div 
              key={itemClass.id}
              className={`auctions-class-tab ${selectedClassId === itemClass.id ? 'selected' : ''}`}
              onClick={() => onItemClassClick(itemClass.id)}
            >
              {itemClass.name || 'Unknown'}
            </div>
          ))}
        </div>
      </div>
      
      {/* 서브클래스 표시 영역 */}
      {selectedClassId !== null && (
        <AuctionsSubClassesTab
          itemClassName={itemClasses.find(cls => cls.id === selectedClassId)?.name || 'Unknown'}
          subclasses={subclasses}
          selectedSubclasses={selectedSubclasses}
          isLoading={loadingSubclasses}
          error={subclassError}
          onSubclassSelection={onSubclassSelection}
        />
      )}
    </>
  );
};

export default AuctionsClassesTab;
