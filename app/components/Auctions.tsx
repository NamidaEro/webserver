import React, { useState, useEffect, useMemo } from 'react';
import CurrencyConverter from './CurrencyConverter';
import AuctionsClassesTab from './AuctionsClassesTab';
import { saveAuctionsToFirestore, getAuctionsFromFirestore } from '../lib/firestoreService';

interface AuctionsProps {
  realmId: string | null;
}

interface Auction {
  id: number;
  item: { id: number };
  buyout: number;
  itemClassId?: number | null;
  itemSubclassId?: number | null;
  itemName?: string;
}

interface ItemSubclass {
  id: number;
  name: string;
}

const Auctions: React.FC<AuctionsProps> = ({ realmId }) => {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemClasses, setItemClasses] = useState<any[]>([]);
  const [selectedItemClasses, setSelectedItemClasses] = useState<number[]>([]);
  const [selectedSubclasses, setSelectedSubclasses] = useState<number[]>([]);
  const [filteredAuctions, setFilteredAuctions] = useState<Auction[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const itemsPerPage = 10;

  const itemDetailsCache = useMemo(() => new Map<number, { 
    itemClassId: number | null; 
    itemSubclassId: number | null;
    itemName: string 
  }>(), []);

  const paginatedAuctions = filteredAuctions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredAuctions.length / itemsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  const handleItemClassClick = (classId: number) => {
    // Toggle the selected class ID
    setSelectedClassId(prevClassId => prevClassId === classId ? null : classId);
  };

  const handleItemClassSelection = async (id: number) => {
    setSelectedItemClasses((prevSelected) => {
      const updatedSelection = prevSelected.includes(id)
        ? prevSelected.filter((classId) => classId !== id)
        : [...prevSelected, id];

      // Update filtered auctions based on the new selection
      const updatedFilteredAuctions = auctions.filter((auction) => {
        const itemClassId = auction.itemClassId;
        return (
          updatedSelection.length === 0 ||
          (itemClassId != null && updatedSelection.includes(itemClassId))
        );
      });

      setFilteredAuctions(updatedFilteredAuctions);
      return updatedSelection;
    });

    // 여기서 필터링된 경매 아이템의 세부 정보를 가져옵니다
    const filteredAuctionIds = auctions
      .filter((auction) => selectedItemClasses.includes(auction.itemClassId || -1))
      .map((auction) => auction.item.id);

    const uncachedIds = filteredAuctionIds.filter((id) => !itemDetailsCache.has(id));

    if (uncachedIds.length > 0) {
      try {
        const itemResponse = await fetch('/api/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ auctions: uncachedIds.map((id) => ({ item: { id } })) }),
        });

        if (!itemResponse.ok) {
          console.error('Failed to fetch item details for filtered auctions');
          return;
        }

        const itemsData = await itemResponse.json();
        itemsData.forEach((item: { id: number; name: string; classid: number | null }) => {
          itemDetailsCache.set(item.id, {
            itemClassId: item.classid || null,
            itemSubclassId: null,
            itemName: item.name,
          });
        });

        setFilteredAuctions((prevFiltered) =>
          prevFiltered.map((auction) => {
            const itemDetails = itemDetailsCache.get(auction.item.id);
            return {
              ...auction,
              itemName: itemDetails?.itemName || auction.itemName || 'Unknown',
            };
          })
        );
      } catch (err) {
        console.error('Error fetching item details for filtered auctions:', err);
      }
    }
  };
  const handleSubclassSelection = (subclassId: number) => {
    setSelectedSubclasses((prevSelected) => {
      const updatedSelection = prevSelected.includes(subclassId)
        ? prevSelected.filter((id) => id !== subclassId)
        : [...prevSelected, subclassId];

      const updatedFilteredAuctions = auctions.filter((auction) => {
        const itemSubclassId = auction.itemSubclassId;
        return (
          updatedSelection.length === 0 ||
          (itemSubclassId != null && updatedSelection.includes(itemSubclassId))
        );
      });

      setFilteredAuctions(updatedFilteredAuctions);
      return updatedSelection;
    });

    // Reset to first page when changing filters
    setCurrentPage(1);
  };


  useEffect(() => {
    if (!realmId) return;

    const fetchAuctions = async () => {
      setLoading(true);
      setError(null);      try {
        // 먼저 Firestore에서 데이터 확인 시도
        try {
          const firestoreAuctions = await getAuctionsFromFirestore(realmId);
          if (firestoreAuctions.length > 0) {
            console.log('Using cached auction data from Firestore');
            // Firestore 데이터를 Auction 타입에 맞게 변환
            const auctionsData: Auction[] = firestoreAuctions.map(item => ({
              id: item.id,
              item: { id: item.itemId || 0 },
              buyout: item.buyout,
              itemClassId: item.itemClassId,
              itemSubclassId: item.itemSubclassId,
              itemName: item.itemName
            }));
            setAuctions(auctionsData);
            setFilteredAuctions(auctionsData);
            setLoading(false);
            setSaveStatus('Firestore 캐시에서 데이터를 불러왔습니다');
            return;
          }
        } catch (firestoreError) {
          console.error('Error fetching from Firestore, falling back to API:', firestoreError);
          // 권한 오류인지 확인
          const errorMessage = String(firestoreError);
          if (errorMessage.includes('permission') || errorMessage.includes('denied')) {
            setSaveStatus('Firestore 권한 오류: Firebase 보안 규칙을 확인하세요');
          }
        }

        // Firestore에 데이터가 없으면 API에서 가져오기
        const response = await fetch(`/api/auctions?realmId=${realmId}`);
        if (!response.ok) {
          const errorDetails = await response.json();
          throw new Error(errorDetails.error || 'Failed to fetch auctions');
        }
        const data = await response.json();
        console.log('Fetched auctions data from API:', data);
        
        const fetchedAuctions = data.auctions || [];
        setAuctions(fetchedAuctions);
        setFilteredAuctions(fetchedAuctions);
          // Firestore에 데이터 저장 시도
        if (fetchedAuctions.length > 0) {
          try {
            const savedIds = await saveAuctionsToFirestore(fetchedAuctions, realmId);
            console.log('Successfully saved auctions to Firestore');
            
            if (savedIds.length === 0) {
              // 권한 오류로 인해 저장이 안 된 경우
              setSaveStatus('Firestore 권한 오류: Firebase 보안 규칙을 확인하세요 (FIREBASE_SECURITY_RULES.md 참조)');
            } else {
              setSaveStatus(`${savedIds.length}개 아이템 데이터가 Firestore에 캐시되었습니다`);
            }
          } catch (saveError: any) {
            console.error('Failed to save auctions to Firestore:', saveError);
            
            // 에러 메시지 분석하여 사용자 친화적인 메시지 표시
            const errorMessage = String(saveError);
            if (errorMessage.includes('permission') || errorMessage.includes('denied') || 
                (saveError.code && saveError.code.includes('permission'))) {
              setSaveStatus('Firestore 권한 오류: Firebase 보안 규칙을 확인하세요 (FIREBASE_SECURITY_RULES.md 참조)');
            } else {
              setSaveStatus('Firestore 캐시 저장 실패: ' + (saveError.message || '알 수 없는 오류'));
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchAuctions();
  }, [realmId]);

  useEffect(() => {
    const fetchItemDetailsForPage = async () => {
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = currentPage * itemsPerPage;
      const currentPageAuctions: Auction[] = filteredAuctions.slice(startIndex, endIndex);

      console.log('Current page auctions:', currentPageAuctions);

      if (currentPageAuctions.length === 0) return;

      const uncachedAuctions = currentPageAuctions.filter(
        (auction) => !itemDetailsCache.has(auction.item?.id)
      );

      if (uncachedAuctions.length === 0) {
        console.log('All items for the current page are already cached.');
        return;
      }

      try {
        const auctionsPayload = uncachedAuctions.map((auction: Auction) => ({ item: { id: auction.item?.id } }));
        const itemResponse = await fetch('/api/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ auctions: auctionsPayload }),
        });

        if (!itemResponse.ok) {
          const itemErrorDetails = await itemResponse.json();
          console.error('Failed to fetch item details:', itemErrorDetails);
          throw new Error(itemErrorDetails.error || 'Failed to fetch item details');
        }

        const itemsData = await itemResponse.json();
        console.log('Items API response:', itemsData);
        itemsData.forEach((item: { id: number; name: string; classid: number | null }) => {
          itemDetailsCache.set(item.id, {
            itemClassId: item.classid || null,
            itemSubclassId: null,
            itemName: item.name,
          });
        });

        setAuctions((prevAuctions: Auction[]) => {
          return prevAuctions.map((auction) => {
            const itemDetails = itemDetailsCache.get(auction.item?.id);
            return {
              ...auction,
              itemClassId: itemDetails?.itemClassId || auction.itemClassId || null,
              itemSubclassId: itemDetails?.itemSubclassId || auction.itemSubclassId || null,
              itemName: itemDetails?.itemName || auction.itemName || 'Unknown',
            };
          });
        });
      } catch (err) {
        console.error('Error fetching item details for current page:', err);
      }
    };

    fetchItemDetailsForPage();
  }, [currentPage, filteredAuctions, itemDetailsCache]);

  useEffect(() => {
    const fetchItemClasses = async () => {
      try {
        const response = await fetch('/api/item-classes');
        if (!response.ok) {
          throw new Error('Failed to fetch item classes');
        }
        const data = await response.json();
        const sortedItemClasses = data.item_classes.sort((a: any, b: any) => a.id - b.id);
        setItemClasses(sortedItemClasses);
      } catch (error) {
        console.error('Error fetching item classes:', error);
      }
    };

    fetchItemClasses();
  }, []);

  useEffect(() => {
    const updatedFilteredAuctions = auctions.filter((auction) => {
      const itemClassId = auction.itemClassId;
      const itemSubclassId = auction.itemSubclassId;
      return (
        (selectedItemClasses.length === 0 || (itemClassId != null && selectedItemClasses.includes(itemClassId))) &&
        (selectedSubclasses.length === 0 || (itemSubclassId != null && selectedSubclasses.includes(itemSubclassId)))
      );
    });
    setFilteredAuctions(updatedFilteredAuctions);
  }, [auctions, selectedItemClasses, selectedSubclasses]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* AuctionsClassesTab 컴포넌트 사용 */}
      <AuctionsClassesTab
        itemClasses={itemClasses}
        selectedClassId={selectedClassId}
        selectedItemClasses={selectedItemClasses}
        selectedSubclasses={selectedSubclasses}
        onItemClassClick={handleItemClassClick}
        onSubclassSelection={handleSubclassSelection}
      />

      {/* 경매 목록 표시 */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0' }}>
        {saveStatus && (
          <div style={{ 
            padding: '5px 10px', 
            borderRadius: '4px', 
            backgroundColor: saveStatus.includes('Failed') ? '#ffdddd' : '#ddffdd',
            color: saveStatus.includes('Failed') ? '#990000' : '#006600'
          }}>
            {saveStatus}
          </div>
        )}
      </div>
      
      <table style={{ borderCollapse: 'collapse', width: '100%', margin: '0 auto' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }} align="center">Auction ID</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }} align="center">Item ID</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }} align="center">Item Name</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }} align="center">Buyout</th>
            </tr>
          </thead>
          <tbody>
            {paginatedAuctions.map((auction) => (
              <tr key={auction.id}>
                <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }} align="center">{auction.id}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }} align="center">{auction.item?.id}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }} align="center">{auction.itemName || 'Unknown'}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }} align="center">
                  <CurrencyConverter copper={auction.buyout} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      <div style={{ width: '100%', textAlign: 'center' }}>
        {/* <h2 style={{ textAlign: 'center' }}>Auctions</h2> */}
        {loading && <p style={{ textAlign: 'center' }}>Loading...</p>}
        {error && <p style={{ color: 'red', textAlign: 'center' }}>Error: {error}</p>}
          <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <button 
              onClick={handlePreviousPage} 
              disabled={currentPage === 1}
              style={{ padding: '5px 10px', marginRight: '10px' }}
            >
              이전
            </button>
            <span style={{ display: 'flex', alignItems: 'center' }}>Page {currentPage} of {totalPages}</span>
            <button 
              onClick={handleNextPage} 
              disabled={currentPage >= totalPages}
              style={{ padding: '5px 10px', marginLeft: '10px' }}
            >
              다음
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auctions;
